This is not Node.js:

- No import / require / fetch / process / Node fs
- No callback APIs: page.on, page.route, exposeFunction, waitForEvent — sandbox functions cannot cross the boundary
- CPU and wall-clock time are bounded (--timeout, default 30s)
- Values crossing evaluate must be JSON-serializable
