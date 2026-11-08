---
applyTo: "**/*.{test,spec}.{ts,tsx}"
---
# Testing Rules

- Use Jest (`jest-expo`) and `@testing-library/react-native`.
- Query by role/label/text (`getByRole`, `getByText`), not by `testID`, unless necessary.
- Use `userEvent` / `fireEvent` for interactions and `await findBy*` for async UI.
- Mock native modules in `jest.setup.ts`; mock network with MSW or jest mocks.
- One behavior per test; name tests as "should <behavior> when <condition>".
