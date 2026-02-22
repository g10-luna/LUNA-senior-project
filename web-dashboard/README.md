# LUNA Librarian Web Dashboard — Frontend

React + TypeScript (Vite) app for the librarian web dashboard.

## Prerequisites
- Node.js 18+
- npm

## Install
cd frontend
npm install

## Run locally
npm run dev

## API URL config
Copy the example env file:

cp .env.example .env

Set:
VITE_API_BASE_URL=http://localhost:8000

## Folder layout (aligned with Frontend Implementation Doc Section 3)
src/screens/ — page-level screens  
src/components/ui/ — reusable UI components  
src/components/domain/ — domain-specific components  
src/layouts/ — app shell + layout wrappers  
src/lib/ — shared helpers (API client, utils)

See: System Design/FRONTEND_IMPLEMENTATION.md

