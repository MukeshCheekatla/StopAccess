const cssInteropPlugin =
  require('react-native-css-interop/dist/babel-plugin').default;

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    cssInteropPlugin,
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic',
        importSource: 'react-native-css-interop',
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
