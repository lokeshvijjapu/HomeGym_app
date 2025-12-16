import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';
import {Buffer} from 'buffer';

// Buffer polyfill for react-native-ble-plx
global.Buffer = global.Buffer || Buffer;

function Root() {
  return (
    <NavigationContainer>
      <App />
    </NavigationContainer>
  );
}

AppRegistry.registerComponent(appName, () => Root);
