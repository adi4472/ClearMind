# CLAUDE.md

Cognitive Hygiene App — React Native (Expo) starter scaffolded from the project outline in `Cognitive-hygiene-react-native-starter(1).docx`.

## What this is

A two-package project:

- **Frontend** (project root) — Expo SDK 54 + Expo Router 6 + TypeScript, Zustand for state.
- **Backend** (`backend/`) — Express + ts-node-dev, currently a stub returning hardcoded JSON.

## How to run dev

```bash
# Terminal 1 — backend (port 1234)
cd backend && npm run dev

# Terminal 2 — Expo (Metro on port 8081)
npx expo start
```

Open the QR code in Expo Go on a phone, or press `i` / `a` for simulators.

## Ports

- Backend: **1234** (changed from the outline's default of 3000 — user already had something on 3000).
- Expo / Metro: **8081**.

## Architecture (matches the outline)

```
app/              Expo Router screens (_layout, index, result, history, settings)
components/       ThoughtInput, AIResponseCard, QuickActionButton, InsightCard
services/api.ts   fetch wrappers for /analyze-thought and /history
store/            useUserStore, useSessionStore (Zustand)
types/            session.ts, user.ts (matches the section-1 contract)
constants/theme.ts
backend/server.ts Express stub
```

The Gemini response contract (section 8 of the outline) defines the JSON shape every backend response must match: `{ summary, pattern, next_step, tool }` where `tool` is `'focus_timer' | 'break_it_down' | 'mental_reset' | null`.

## Outstanding work

- **AI integration** — `backend/server.ts` has `// TODO: call Gemini here`. The `/analyze-thought` route currently returns the same canned response regardless of input. Provider not yet chosen (Gemini per outline, but Claude/OpenAI also viable).
- **API base URL is a LAN IP** — `services/api.ts:3` is `http://localhost:1234`, which only works for the iOS simulator. For phone testing, swap in the laptop's LAN IP (current machine: `192.168.100.15`). For production, swap in the deployed backend URL.
- **History persistence** — backend `/history` returns a single hardcoded item; no DB yet.
- **Voice input** — listed in section 9 build order, not implemented.
- **Assets** — `app.json` references `./assets/icon.png` and `./assets/adaptive-icon.png`; folder doesn't exist yet. `npx expo prebuild` or placeholder PNGs will resolve this when building.

## Gotchas encountered during setup

These bit us on first install — leaving notes so future sessions don't relearn them:

- **SDK mismatch with Expo Go.** Initially scaffolded against SDK 52; current Expo Go on the App/Play Store only supports the latest (SDK 54). Upgrade path: bump `expo` in package.json, then `npx expo install --fix`.
- **React 19 peer conflicts.** SDK 54 wants React 19.1.0; transitive `react-dom@19.2.5` complained. Fix: `npm install … --legacy-peer-deps` for any extra dev deps.
- **`babel-preset-expo` not auto-installed at the root.** Even though `expo` nests it, Babel resolves from the project root. Must be added explicitly to devDependencies, **pinned to the SDK's major** (`~54.0.10` for SDK 54 — `latest` was v55 and conflicts). Installed with `--legacy-peer-deps`.
- **`react-native-worklets` is now a separate package.** Reanimated v4 (SDK 54) split out the worklets Babel plugin. Install with `npx expo install react-native-worklets`.

## Conventions

- The project uses Expo Router file-based routing. Add a screen by adding a file under `app/`.
- Path alias `@/*` is configured in `tsconfig.json` mapped to the project root.
- Don't put secrets in the RN client. API keys belong in the backend.
