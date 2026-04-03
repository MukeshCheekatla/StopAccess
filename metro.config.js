const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
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
      '@focusgate/core': path.resolve(__dirname, 'packages/core'),
      '@focusgate/state': path.resolve(__dirname, 'packages/state'),
      '@focusgate/sync': path.resolve(__dirname, 'packages/sync'),
      '@focusgate/types': path.resolve(__dirname, 'packages/types'),
    },
    unstable_enablePackageExports: true,
  },
  watchFolders: [
    __dirname,
    path.resolve(__dirname, 'packages/core'),
    path.resolve(__dirname, 'packages/state'),
    path.resolve(__dirname, 'packages/sync'),
    path.resolve(__dirname, 'packages/types'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
