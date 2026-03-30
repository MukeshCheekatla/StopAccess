module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    jest: true,
  },
  overrides: [
    {
      files: ['extension/**/*.js'],
      env: {
        browser: true,
        webextensions: true,
      },
      rules: {
        'no-alert': 'off',
      },
      globals: {
        chrome: 'readonly',
      },
    },
  ],
};
