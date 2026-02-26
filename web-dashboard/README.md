# LUNA Librarian Web Dashboard — Frontend

React + TypeScript app for the librarian web dashboard, built with Vite.

## Location in Monorepo

This frontend lives in the main repository at:

- `/web-dashboard` – librarian web dashboard (this project)

From the repository root, all commands below assume you first:

```bash
cd web-dashboard
```

## Tech Stack

- React
- TypeScript
- Vite

See `package.json` for exact version constraints.

## Prerequisites

- Node.js (LTS version recommended)
- npm

To verify your installation:

```bash
node -v
npm -v
```

## Troubleshooting

- If `npm install` fails:
  - Verify your Node version with `node -v`
  - Delete `node_modules` and `package-lock.json`, then retry `npm install`

- If `npm run dev` fails:
  - Confirm you are inside `/web-dashboard`
  - Ensure your `.env` file exists and contains a valid `VITE_API_BASE_URL`

- If the app loads but API calls fail:
  - Confirm the backend service is running at the configured `VITE_API_BASE_URL`

## Getting Started

### Install dependencies

From the repository root:

```bash
cd web-dashboard
npm install
```

### Environment configuration

Create a local `.env` file at the root of `web-dashboard` based on the example:

```bash
cp .env.example .env
```

The example file includes:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

- Ensure the backend/API is running and reachable at your configured `VITE_API_BASE_URL`.  
- For non-local environments, add/update the corresponding `VITE_API_BASE_URL` entry as needed (TODO: document environment-specific values).

If you change `.env`, stop and restart `npm run dev` so Vite picks up the new environment variables.

### Run the dev server

From `web-dashboard`:

```bash
npm run dev
```

Vite will print the local development URL in the terminal (TODO: confirm and document the canonical dev URL used by the team).

## Available npm scripts

The following scripts are defined in `package.json`:

- `npm run dev` – start the Vite development server.
- `npm run build` – type-check and build the production bundle.
- `npm run preview` – serve the built bundle locally for preview after a successful `npm run build`.
- `npm run lint` – run ESLint on the project.

## Project structure (high level)

Key folders under `src/`:

- `src/screens/` – page-level screens (Dashboard, Catalog, Maintenance, Map, Account Settings, Options Menu).
- `src/components/ui/` – reusable, generic UI building blocks (buttons, cards, badges, tabs, search inputs, etc.).
- `src/components/domain/` – domain-specific components for tasks, catalog, maintenance, and map.
- `src/layouts/` – app shell and layout wrappers (e.g., top bar layout).
- `src/lib/` – shared helpers (mock data, types, API client/utilities).
- `src/routes/` – routing configuration for the app.


For a more detailed breakdown of pages, components, and flows, see `System Design/FRONTEND_IMPLEMENTATION.md`.

