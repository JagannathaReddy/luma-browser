# create-luma

Guided setup for [luma-browser](https://github.com/JagannathaReddy/luma-browser).

```bash
npm create @jagannathamv/luma@latest
```

Installs `luma-browser`, downloads Chromium, and prints agent-plugin next steps.

If global install fails with `EACCES`, fix npm's prefix once:

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Or use npx without a global install: `npx @jagannathamv/luma-browser install`

Published separately from the main `luma-browser` package. Bump versions with `node scripts/sync-version.mjs <semver>` from the repo root.
