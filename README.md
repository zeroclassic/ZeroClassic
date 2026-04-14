# ZercWallet v2.0

Desktop wallet for **ZeroClassic (ZERC)** — compatible with node Phoenix 5.0.0-beta2.
Built with Electron 28 + React 18 + TypeScript. Runs on **Windows**, **Linux** and **macOS**.

---

## Features

- 🔵 **Transparent addresses** (T-addr) — standard transactions
- 🔒 **Shielded addresses** (Z-addr) — private via zk-SNARKs
- 📊 **Dashboard** — balance, node stats, recent transactions
- ↑ **Send** — transparent & shielded transactions with memo support
- ↓ **Receive** — address display with QR code + copy
- 📋 **Transactions** — full history with filters, from/to addresses and explorer links
- ⊞ **Addresses** — manage T and Z addresses
- 🔑 **Keys & Backup** — export/import private keys, backup wallet
- 🔧 **Tools** — shield coinbase, merge UTXOs, wallet info
- ⚙ **Settings** — configurable RPC connection, node auto-start
- 🔄 **Auto-refresh** on every new block

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| zerod | Phoenix 5.0.0-beta2 |

> **Windows**: Download Node.js from https://nodejs.org (LTS version).
> Verify installation: `node -v` and `npm -v` in PowerShell.

---

## Node configuration

In `%APPDATA%\ZeroClassic\zero.conf` on Windows, or `~/.zeroclassic/zero.conf` on Linux:

```conf
server=1
listen=1
rpcuser=your_rpc_user
rpcpassword=your_rpc_password
rpcport=10004
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpctimeout=60
dbcache=512
par=4
gen=0
```

Optional — enables fast transaction indexing (recommended for heavy wallets):
```conf
addressindex=1
spentindex=1
timestampindex=1
```

> ZercWallet **auto-detects** this file on first launch and pre-fills the Settings.

---

## Development

### Windows (PowerShell)

```powershell
cd zerc-wallet
npm install

# Terminal 1 — compile in watch mode
npm run dev

# Terminal 2 — launch Electron (wait for Vite to be ready first)
npm run electron:dev
```

### Linux / macOS

```bash
npm install
npm run dev &
npm run electron:dev
```

---

## Build & distribute

### Windows
```powershell
npm install
npm run dist:win
```
Generates in `release/`:
- `ZercWallet Setup X.X.X.exe` — NSIS installer with desktop shortcut
- `ZercWallet X.X.X.exe` — portable executable

### Linux
```bash
npm install
chmod -R +x node_modules/.bin/
chmod +x node_modules/app-builder-bin/linux/x64/app-builder
chmod +x node_modules/7zip-bin/linux/x64/7za
npm run dist:linux
```
Generates in `release/`:
- `ZercWallet-X.X.X.AppImage` — universal (x64)
- `ZercWallet-X.X.X-arm64.AppImage` — ARM64
- `zerc-wallet_X.X.X_amd64.deb` — Debian/Ubuntu (x64)
- `zerc-wallet_X.X.X_arm64.deb` — Debian/Ubuntu (ARM64)

---

## Versioning

To update the version, edit **only** `package.json`:

```json
{
  "version": "2.1.0",
  "zerc": {
    "targetNode": "Phoenix 5.0.0"
  }
}
```

The version is automatically injected into the app at build time — no other files to change.

---

## Project structure

```
zerc-wallet/
├── src/
│   ├── main/                   ← Electron main process (Node.js)
│   │   ├── main.ts             ← Entry point + IPC handlers
│   │   ├── rpc.ts              ← JSON-RPC client for zerod
│   │   ├── config.ts           ← Config manager + auto-detection
│   │   ├── nodeManager.ts      ← zerod auto-start/stop
│   │   └── preload.ts          ← Secure bridge → window.zerc API
│   ├── renderer/               ← React UI
│   │   ├── App.tsx             ← Root component + routing
│   │   ├── hooks/
│   │   │   └── useWallet.ts    ← Data fetching + block-based polling
│   │   ├── components/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ErrorScreen.tsx
│   │   │   └── LoadingScreen.tsx
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── Send.tsx
│   │       ├── Receive.tsx
│   │       ├── Transactions.tsx
│   │       ├── Addresses.tsx
│   │       ├── Keys.tsx
│   │       ├── Tools.tsx
│   │       └── Settings.tsx
│   └── shared/
│       └── types.ts            ← Shared TypeScript types + IPC constants
├── build/
│   ├── icons/                  ← App icons (multiple sizes)
│   └── scripts/                ← Post-install scripts for .deb
├── resources/                  ← App icon source
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.main.json
└── package.json
```

---

## Configuration file

ZercWallet saves its config to:
- **Windows**: `%APPDATA%\zerc-wallet\config.json`
- **Linux/macOS**: `~/.zerc-wallet/config.json`

---

## Security

- **Context isolation** enabled — renderer has no direct Node.js access
- All IPC calls go through the typed `window.zerc` API (preload bridge)
- RPC credentials stored locally in the config file above
- No telemetry, no external connections

---

## License

MIT — ZeroClassic Community

## Links

- Website: https://zeroclassic.org
- GitHub: https://github.com/zeroclassic/ZercWalletV2
- Explorer: https://explorer.zeroclassic.org
