---
name: expo-eas-build
description: Build, update, and submit Expo apps with EAS (Expo Application Services): dev builds, preview and production builds, OTA updates, and store submission. Use when the user asks about building APK/IPA/AAB, releasing, or OTA updates.
---

# EAS Build & Release

## Setup

```bash
npm i -g eas-cli
eas login
eas build:configure
```

## eas.json profiles

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

## Commands

- Dev build: `eas build --profile development --platform android|ios`
- Preview (testers): `eas build --profile preview --platform all`
- Production: `eas build --profile production --platform all`
- Submit: `eas submit --platform ios|android`
- OTA update (JS/assets only): `eas update --branch production --message "fix"`

## Rules

- Use a development build (not Expo Go) when using custom native modules or config plugins.
- Native changes (new native library, permissions, app config plugins) require a new build; JS-only changes can use `eas update`.
- Store secrets with `eas secret:create` / EAS environment variables, never in the repo.
- Keep `runtimeVersion` policy set (`appVersion` or `fingerprint`) so OTA updates match the binary.
