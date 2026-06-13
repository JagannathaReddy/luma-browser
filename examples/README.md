# luma-browser examples

Runnable demo scripts for agents and humans.

```bash
luma-browser install
luma-browser run examples/example.com.js
luma-browser run examples/hn-titles.js
luma-browser run examples/wikipedia-titles.js
luma-browser run examples/login-flow.stub.js   # observe-first login stub
```

## Multi-step session demo

```bash
bash examples/session-demo.sh
```

Or manually:

```bash
id=$(luma-browser session start --name examples-demo --no-video | jq -r .sessionId)
luma-browser run examples/example.com.js --session "$id" --step open
luma-browser session end "$id"
luma-browser viewer --session "$id" --open
```

See `skills/luma-scripting/references/REFERENCE.md` for the full sandbox API.
