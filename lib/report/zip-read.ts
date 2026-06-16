import { readFile } from 'fs/promises';
import { inflate, inflateRaw } from 'zlib';
import { promisify } from 'util';

const inflateAsync = promisify(inflate);
const inflateRawAsync = promisify(inflateRaw);

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_CENTRAL = 0x06054b50;
const DATA_DESCRIPTOR = 0x08074b50;

export async function readZipEntry(zipPath, entryName) {
  const buffer = await readFile(zipPath);

  const fromLocal = readFromLocalHeaders(buffer, entryName);
  if (fromLocal) {
    return decompressEntry(fromLocal.compressed, fromLocal.compression);
  }

  const fromCentral = readFromCentralDirectory(buffer, entryName);
  if (!fromCentral) {
    throw new Error(`Zip entry "${entryName}" not found in ${zipPath}`);
  }

  const local = readLocalEntryAt(buffer, fromCentral.localHeaderOffset, entryName);
  return decompressEntry(local.compressed, local.compression);
}

export async function readZipEntryText(zipPath, entryName) {
  const bytes = await readZipEntry(zipPath, entryName);
  return bytes.toString('utf8');
}

function readFromLocalHeaders(buffer, entryName) {
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== LOCAL_HEADER) {
      break;
    }

    const flags = buffer.readUInt16LE(offset + 6);
    const compression = buffer.readUInt16LE(offset + 8);
    let compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + fileNameLength);
    const dataStart = nameStart + fileNameLength + extraLength;

    if (name === entryName) {
      let dataEnd = dataStart + compressedSize;

      if ((flags & 0x0008) !== 0 || compressedSize === 0) {
        const descriptor = findDataDescriptor(buffer, dataStart);
        if (!descriptor) {
          return null;
        }
        compressedSize = descriptor.compressedSize;
        dataEnd = descriptor.dataEnd;
      }

      return {
        compression,
        compressed: buffer.subarray(dataStart, dataEnd),
      };
    }

    if ((flags & 0x0008) !== 0 || compressedSize === 0) {
      const descriptor = findDataDescriptor(buffer, dataStart);
      offset = descriptor ? descriptor.dataEnd : dataStart;
    } else {
      offset = dataStart + compressedSize;
    }
  }

  return null;
}

function readFromCentralDirectory(buffer, entryName) {
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset == null) {
    return null;
  }

  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  let offset = centralOffset;

  while (offset + 46 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== CENTRAL_HEADER) {
      break;
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    if (name === entryName) {
      return { compression, compressedSize, localHeaderOffset };
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

function readLocalEntryAt(buffer, offset, entryName) {
  const signature = buffer.readUInt32LE(offset);
  if (signature !== LOCAL_HEADER) {
    throw new Error(`Invalid local header for "${entryName}"`);
  }

  const flags = buffer.readUInt16LE(offset + 6);
  const compression = buffer.readUInt16LE(offset + 8);
  const compressedSize = buffer.readUInt32LE(offset + 18);
  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  let dataEnd = dataStart + compressedSize;

  if ((flags & 0x0008) !== 0 || compressedSize === 0) {
    const descriptor = findDataDescriptor(buffer, dataStart);
    if (!descriptor) {
      throw new Error(`Missing data descriptor for "${entryName}"`);
    }
    dataEnd = descriptor.dataEnd;
  }

  return {
    compression,
    compressed: buffer.subarray(dataStart, dataEnd),
  };
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 65_536);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_CENTRAL) {
      return offset;
    }
  }
  return null;
}

// Two-pass scan: first walks forward and bails at the next local/central header
// sig (covers the common ZIP-spec layout). Second pass falls back to scanning
// the remainder of the buffer for traces that omit signatures or place the
// descriptor unexpectedly.
function findDataDescriptor(buffer, dataStart) {
  let offset = dataStart;

  while (offset + 12 <= buffer.length) {
    if (buffer.readUInt32LE(offset) === DATA_DESCRIPTOR) {
      return {
        compressedSize: buffer.readUInt32LE(offset + 8),
        dataEnd: offset,
      };
    }

    if (
      buffer.readUInt32LE(offset) === LOCAL_HEADER ||
      buffer.readUInt32LE(offset) === CENTRAL_HEADER
    ) {
      break;
    }

    offset += 1;
  }

  for (let offset = dataStart; offset + 12 <= buffer.length; offset += 1) {
    if (buffer.readUInt32LE(offset) === DATA_DESCRIPTOR) {
      return {
        compressedSize: buffer.readUInt32LE(offset + 8),
        dataEnd: offset,
      };
    }
  }

  return null;
}

async function decompressEntry(compressed, compression) {
  if (compression === 0) {
    return compressed;
  }

  if (compression === 8) {
    try {
      return await inflateAsync(compressed);
    } catch {
      return inflateRawAsync(compressed);
    }
  }

  throw new Error(`Unsupported zip compression method ${compression}`);
}
