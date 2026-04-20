// Jest mock for @sentry/react-native
// brand.ts uses Sentry.captureMessage for unknown brand fallback warnings.
// In test environment, we stub to a no-op to avoid ESM parse errors.

export const captureMessage = jest.fn();
export const captureException = jest.fn();
export const withScope = jest.fn();
export const init = jest.fn();

export default {
  captureMessage,
  captureException,
  withScope,
  init,
};
