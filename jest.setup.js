/**
 * jest.setup.js -- Global Jest setup for StopAccess.
 *
 * Referenced by setupFilesAfterFramework in jest.config.js.
 * Runs after the test framework is installed in the environment.
 *
 * Responsibilities:
 *  - Use fake timers so interval-based code (ruleEngine) is testable.
 *  - Silence noisy console output from React Native internals.
 *  - Provide any global stubs needed across all test files.
 */

// Use modern fake timers (jest.useFakeTimers uses @sinonjs/fake-timers under
// the hood in Jest 27+). Tests that need real timers can call
// jest.useRealTimers() locally.
jest.useFakeTimers();

// Suppress React Native's act() warnings and other internal console noise
// that pollutes test output without adding signal.
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.warn = (...args) => {
  const msg = args[0]?.toString() ?? '';
  if (
    msg.includes('Animated:') ||
    msg.includes('componentWillReceiveProps') ||
    msg.includes('componentWillMount')
  ) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  const msg = args[0]?.toString() ?? '';
  if (
    msg.includes('Warning: An update to') ||
    msg.includes('Warning: Cannot update') ||
    msg.includes('act(...)')
  ) {
    return;
  }
  originalError(...args);
};

// Global afterEach: restore all mocks so tests don't bleed into each other.
afterEach(() => {
  jest.restoreAllMocks();
});
