export function readLines(socket, onLine) {
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line) {
        onLine(line);
      }
    }
  });
}
