# buzze.io

**The live quiz show for your crew.** Host on the big screen while friends join from their phones, buzz in, and answer. First to press wins the round.

![buzze.io](https://img.shields.io/badge/buzze.io-live%20quiz-7c3aed?style=flat-square) ![License](https://img.shields.io/badge/license-GPL--3.0-c084fc?style=flat-square) ![Node](https://img.shields.io/badge/node-v20+-3ee67a?style=flat-square)

---

## Features

- **Custom board** — categories, questions, and point values fully configurable
- **Real-time buzzer** — server-side timestamp queue, no cheating
- **Special questions** — All Play, Challenge a Player, Double Wager
- **Final Challenge** — secret bets, dramatic reveal by the host
- **Timer** — 60s default, with pause, extension, and per-question overrides
- **Media** — images and audio on questions and categories
- **QR Code** — players scan to join instantly, no code typing needed
- **Remote access** — automatic tunnel via localtunnel, zero config
- **Multilingual** — PT-BR, EN and ES with automatic language detection
- **Desktop app** — Electron build for macOS, Windows and Linux

---

## Download

Download the latest installer from the [Releases](https://github.com/gamazyn/buzze/releases) page:

| Platform | File |
|---|---|
| Windows | `buzze-*-x64.exe` (installer) |
| macOS (Apple Silicon) | `buzze-*-arm64.zip` |
| macOS (Intel) | `buzze-*-x64.zip` |
| Linux | `buzze-*-x86_64.AppImage` |

> **Security note:** the binaries are not signed with a paid certificate. See the platform-specific instructions below.

### Windows

SmartScreen may show a warning when opening the installer. To proceed:

1. Click **More info**
2. Click **Run anyway**

### macOS

Gatekeeper will block the app on first launch. To allow it:

```bash
xattr -dr com.apple.quarantine /Applications/buzze.io.app
```

Or: right-click the app → **Open** → **Open** in the confirmation dialog.

### Linux

Make the AppImage executable and run it directly:

```bash
chmod +x buzze-*.AppImage
./buzze-*.AppImage
```

---

## Requirements

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io) v9+

## Installation

```bash
git clone https://github.com/gamazyn/buzze
cd buzze
pnpm install
```

### Load a sample game

To test quickly without creating a game from scratch:

```bash
pnpm seed
```

Imports the **Test Game** from `samples/` into `data/games/`. It has 5 categories with 5 questions each, including special questions like *All Play* and *Challenge a Player*.

---

## Running in development

```bash
pnpm dev
```

Starts the server (`:3000`) and client (`:5173`) in parallel.

Open **http://localhost:5173** in your browser.

---

## How to play

### 1. Create a game

1. Open the app and click **Editor**
2. Add categories and fill in the questions
3. Configure the Final Challenge (optional)
4. Click **Save**

### 2. Host a room

1. On the home screen, click **Create room**
2. Select the game and click **Create Room**
3. Share the **QR Code** (same network) or the **remote link** with your friends
4. When everyone has joined, click **Start Game**

### 3. Join as a player

- **QR Code** — scan with your camera, enter your name and join directly
- **Remote link** — open the link shared by the host
- **Manual** — open the app, enter your name and the 6-letter room code

### 4. Game flow

1. Host clicks a question on the board to reveal it
2. Players press **BUZZ** to answer — the server orders the queue
3. Host sees the buzzer queue in order and calls on the first player
4. Host judges the answer: **Correct** (+points) or **Wrong** (−points)
5. Once all questions are done, the **Final Challenge** unlocks automatically

---

## Project structure

```
buzze/
├── packages/
│   ├── shared/     # Shared TypeScript types and utilities
│   ├── server/     # Node.js + Express + Socket.io backend
│   ├── client/     # React + Vite + Tailwind frontend
│   └── electron/   # Desktop app (Electron)
├── samples/        # Sample games for seeding
└── data/           # Runtime data (games, uploads)
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Framer Motion |
| Backend | Node.js + Express + Socket.io |
| Desktop | Electron |
| i18n | react-i18next (PT-BR · EN · ES) |
| Monorepo | pnpm workspaces + Turborepo |
| Tunnel | localtunnel |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start server + client in dev mode |
| `pnpm build` | Production build |
| `pnpm type-check` | Type-check all packages |
| `pnpm seed` | Import sample games from `samples/` into `data/` |
| `pnpm electron:dev` | Start the Electron app in dev mode |
| `pnpm electron:dist` | Build the desktop installer |

---

## License

[GPL-3.0](LICENSE)
