export function serializeHostValue(value) {
  if (value === undefined) {
    return { value: null };
  }

  if (value === null) {
    return { value: null };
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { value };
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      type: 'buffer',
      value: Buffer.from(value).toString('base64'),
    };
  }

  if (Array.isArray(value) || (typeof value === 'object' && value.constructor === Object)) {
    return { value };
  }

  return { value: String(value) };
}

export function decodeSandboxBuffer(value) {
  if (typeof value === 'string') {
    return Buffer.from(value, 'base64');
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  throw new TypeError('Expected screenshot data as base64 string or Uint8Array');
}
