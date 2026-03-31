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
  },
  parserOptions: {
    requireConfigFile: false,
  },
};
