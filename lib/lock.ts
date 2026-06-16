export function createKeyedLock() {
  const queues = new Map();

  return async function withLock(key, fn) {
    const previous = queues.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    queues.set(key, current);

    try {
      await previous;
      return await fn();
    } finally {
      release();
      if (queues.get(key) === current) {
        queues.delete(key);
      }
    }
  };
}

export function createMutex() {
  let locked = Promise.resolve();

  return async function withMutex(fn) {
    const previous = locked;
    let release;
    locked = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}
