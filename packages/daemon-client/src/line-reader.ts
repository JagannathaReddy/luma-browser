import type { Socket } from 'node:net';

export function readLines(socket: Socket, onLine: (line: string) => void): void {
  let buffer = '';

  socket.on('data', (chunk: Buffer | string) => {
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
