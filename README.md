# Scoutly

Local-first student opportunity discovery MVP. Phase 1 establishes the TypeScript dashboard shell, local JSON profile storage, configuration, and health/profile APIs. Real opportunity scraping is intentionally not included yet.

## Prerequisites

- Node.js 20 or newer
- npm

## Setup

```bash
cd /Users/harshsahu/AgentCrew/scoutly
npm install
npm install --prefix backend
npm install --prefix frontend
cp .env.example .env
```

Add your OpenRouter key only to `.env` (never commit it). Phase 1 does not call the model, so no key is required to run it.

## Run locally

Run the backend in one terminal:

```bash
cd /Users/harshsahu/AgentCrew/scoutly
npm run dev --prefix backend
```

Run the frontend in another:

```bash
cd /Users/harshsahu/AgentCrew/scoutly
npm run dev --prefix frontend
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:3000/api/health`.

## Verify

```bash
npm run build --prefix frontend
npm run typecheck --prefix backend
```

`MOCK_MODE=true` and `BROWSER_MODE=mock` are the defaults. The profile is stored at `data/student-profile.json` and is served by `GET /api/profile`; replace it through `PUT /api/profile`.
