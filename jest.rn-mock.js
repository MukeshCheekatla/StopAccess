/**
 * jest.rn-mock.js -- Lightweight react-native mock for Jest.
 *
 * Mapped via moduleNameMapper in jest.config.js:
 *   '^react-native$': '<rootDir>/jest.rn-mock.js'
 *
 * Exposes NativeModules as a plain mutable object so tests can inject
 * per-test mocks before calling functions that access NativeModules lazily.
 *
 * Platform.OS defaults to 'android'; tests that need iOS behaviour should
 * set (Platform as { OS: string }).OS = 'ios' in beforeEach.
 */

const NativeModules = {};

const Platform = {
  OS: 'android',
  select: (map) => map[Platform.OS] ?? map.default,
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  hairlineWidth: 0.5,
};

const View = 'View';
const Text = 'Text';
const TouchableOpacity = 'TouchableOpacity';
const ScrollView = 'ScrollView';
const ActivityIndicator = 'ActivityIndicator';
const RefreshControl = 'RefreshControl';

module.exports = {
  NativeModules,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
};
