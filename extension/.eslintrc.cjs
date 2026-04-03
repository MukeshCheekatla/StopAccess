module.exports = {
  extends: '../.eslintrc.js',
  env: {
    browser: true,
    webextensions: true,
  },
  globals: {
    chrome: 'readonly',
  },
  rules: {
    'no-alert': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/sort-styles': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  parserOptions: {
    requireConfigFile: false,
  },
};
