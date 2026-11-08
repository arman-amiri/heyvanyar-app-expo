---
mode: agent
description: Create a new Expo Router screen with feature folder, hook, and test
---
Create a new screen named `${input:screenName}` using Expo Router.

Requirements:
- Route file in `app/` (thin), UI and logic in `src/features/${input:screenName}/`
- Typed props and params, loading/error/empty states
- Data fetching with TanStack Query if an API is involved
- Accessibility labels, safe-area handling, RTL-friendly styles
- A basic test with `@testing-library/react-native`

Follow `.github/copilot-instructions.md`. At the end list any packages to install with `npx expo install`.
