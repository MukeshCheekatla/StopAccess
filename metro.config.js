const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [/android\/app\/build\/.*/, /ios\/build\/.*/],
    extraNodeModules: {
      '@stopaccess/core': path.resolve(__dirname, 'packages/core'),
      '@stopaccess/state': path.resolve(__dirname, 'packages/state'),
      '@stopaccess/sync': path.resolve(__dirname, 'packages/sync'),
      '@stopaccess/types': path.resolve(__dirname, 'packages/types'),
      '@stopaccess/viewmodels': path.resolve(__dirname, 'packages/viewmodels'),
    },
    unstable_enablePackageExports: true,
  },
  watchFolders: [
    __dirname,
    path.resolve(__dirname, 'packages/core'),
    path.resolve(__dirname, 'packages/state'),
    path.resolve(__dirname, 'packages/sync'),
    path.resolve(__dirname, 'packages/types'),
    path.resolve(__dirname, 'packages/viewmodels'),
  ],
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    input: './global.css',
  },
);
