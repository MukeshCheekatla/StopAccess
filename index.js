import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Silence background warning - will be used for interactive notifications later
notifee.onBackgroundEvent(async () => {});

AppRegistry.registerComponent(appName, () => App);
