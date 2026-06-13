export function parseLastJsonBlock(output) {
  const text = output.trim();
  for (let end = text.length - 1; end >= 0; end -= 1) {
    if (text[end] !== '}' && text[end] !== ']') {
      continue;
    }

    const candidate = text.slice(0, end + 1);
    const start = Math.max(candidate.lastIndexOf('{'), candidate.lastIndexOf('['));
    if (start === -1) {
      continue;
    }

    try {
      return JSON.parse(candidate.slice(start));
    } catch {
      // Try an earlier JSON block.
    }
  }

  throw new Error(`No JSON found in output:\n${output}`);
}
