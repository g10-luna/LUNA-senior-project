# LUNA Student Mobile App

React Native (Expo) app for students: book search, request delivery, return, and notifications.

## Prerequisites

- Node.js 18+
- npm or yarn
- **iOS:** Xcode and iOS Simulator (Mac only)
- **Android:** Android Studio and emulator, or physical device
- **Expo Go** (optional): run on a physical device via QR code

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env example and set your backend URL:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `EXPO_PUBLIC_API_URL` to your backend URL (e.g. `http://localhost:8000` when the backend runs locally).

## Run

- Start the dev server:
  ```bash
  npm start
  ```
  or:
  ```bash
  npx expo start
  ```
- Press **i** for iOS simulator or **a** for Android emulator, or scan the QR code with Expo Go on your device.

## Project structure

| Path | Purpose |
|------|---------|
| `app/` | Expo Router file-based routes (tabs, layouts, screens) |
| `src/screens/` | Screen components (Search, Request, Return, Profile, etc.) |
| `src/components/` | Reusable UI components |
| `src/navigation/` | Navigation helpers (if needed alongside expo-router) |
| `src/services/` | API client and backend calls |
| `src/hooks/` | Custom hooks (e.g. useAuth, useBookSearch) |
| `src/store/` | State (e.g. Zustand) |
| `src/types/` | TypeScript types |
| `src/utils/` | Helpers |
| `assets/` | Images, fonts |
| `components/` | Template components (Expo default) |
| `constants/` | Template constants (e.g. Colors) |

See [Mobile App Implementation Design](../System%20Design/MOBILE_APP_IMPLEMENTATION_DESIGN.md) for the full spec.

## Requirement

This app supports **FR-2, FR-3, FR-4, NFR-6** (book discovery, request, return, compatibility). Set up aligns with issue #109.
