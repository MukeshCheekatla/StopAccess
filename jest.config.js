/**
 * jest.config.js -- Jest configuration for the StopAccess React Native project.
 *
 * Key decisions:
 *  - preset: react-native  -- sets up Babel transform and module resolution
 *  - moduleNameMapper: maps 'react-native' to jest.rn-mock.js so tests can
 *    inject mocks into NativeModules before each test.
 *  - setupFilesAfterEnv: jest.setup.js for global mocks (timers, etc.)
 *  - transformIgnorePatterns: allow jest to transform react-native itself and
 *    any RN-ecosystem packages that ship ES modules.
 */

module.exports = {
  preset: 'react-native',

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { presets: ['module:@react-native/babel-preset'] },
    ],
  },

  // Replace the real react-native module with our lightweight mock so that
  // NativeModules is a plain JS object tests can freely mutate.
  moduleNameMapper: {
    '^react-native$': '<rootDir>/jest.rn-mock.js',
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform react-native and common RN libs (they ship non-transpiled JS)
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        'react-native',
        '@react-native',
        '@react-navigation',
        'react-native-mmkv',
      ].join('|') +
      ')/)',
  ],

  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: -10,
    },
  },
};
