Neonflake Gym — Smart Home Gym Controller

Welcome! This README is written for beginners. It explains how to run the app, connect it to Firebase, and test BLE scanning. If anything is unclear, tell me which part you want expanded and I will update it.

## What this app does (simple)
- Discover nearby BLE gym devices.
- Let you configure a workout (weight, reps, time).
- Run an active set with a timer and rep counter.
- Save your workouts to Firebase Firestore and view them in a History screen.

## Quick start (for absolute beginners)

1) Install Node.js (LTS) from https://nodejs.org/
2) Open a terminal (PowerShell on Windows) and go to the project folder. For example:

```powershell
cd D:\Neonflake\ble_app\blescan
```

3) Install packages (run once):

```powershell
# using npm
npm install

# or using yarn
# yarn
```

4) Start the Metro dev server and run the app on Android (keep Metro running):

```powershell
npx react-native start --reset-cache
# In a new terminal window:
npx react-native run-android
```

If you see build errors, read them — missing Android SDK or Pod install issues are common for beginners. Tell me the error and I can help.

## Firebase (required to save history)

1. Go to https://console.firebase.google.com and create a project.
2. In the Firebase console enable **Authentication → Email/Password**.
3. Create a **Firestore** database (start in test mode while developing).
4. Download `google-services.json` (Android) from the Firebase console and copy it into `android/app/`.
5. For iOS (macOS only), follow Firebase's iOS setup and add `GoogleService-Info.plist` to the Xcode project and run `pod install` in `ios/`.

## App usage (basic)
1. Open the app on your phone or emulator.
2. Log in with an email and password (the app will create an account if it does not exist).
3. From Home tap **START WORKOUT** to scan for nearby devices. Grant permissions when prompted.
4. Select your device from the list, choose an exercise, set weight/reps/time, and `START SET`.
5. When a set finishes tap **FINISH SET** — the workout will be saved to Firestore.
6. From Home tap **View History** to see saved workouts.

## Common beginner problems and fixes
- "No devices found" — Make sure Bluetooth is enabled and the device is near. On Android also allow Location permission if prompted.
- "Permissions required" — Android may ask for runtime permissions; accept them or open app settings.
- "saveWorkoutToFirestore is not a function" — Make sure `src/firestoreHistory.ts` exports `saveWorkoutToFirestore` and imports use: `import { saveWorkoutToFirestore } from './src/firestoreHistory';`.
- "Can't build for iOS" — Ensure CocoaPods are installed and run `cd ios && bundle exec pod install`.

## File map (where to look)
- `App.tsx` — main app and all screens; a good place to start reading code.
- `src/firestoreHistory.ts` — helper functions that read/write Firestore.
- `api.ts` — optional backend integration (posts workout data to a server).

## If you get stuck
1. Copy the error message you see in the terminal or the red error screen and paste it in chat here.
2. I will tell you the exact command or file change to fix it.

Want me to add screenshots or a short screencast of logging in and viewing history? Reply and I will add them to this README.

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
