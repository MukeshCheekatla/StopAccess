# Android Recovery Plan

## Current Root Cause

The repo had drifted into a mixed local state:

- `package.json` was pinned to React Native `0.73.2`
- `node_modules` had been installed with React Native `0.77.x`
- several Android-native dependencies were installed at newer incompatible minor versions
- monorepo package imports like `@focusgate/state/rules` were only partially wired
- AGP upgrade warnings were being handled through a deprecated global Gradle property

That combination removed the familiar Metro behavior, broke Android bundling, and caused Gradle build failures.

## Fixes Applied

- normalized React Native and related native library versions back to a coherent `0.73.2` stack
- repaired monorepo package entrypoints so Metro resolves `@focusgate/*` imports
- created Android bundle output folders under `android/app/src/main/assets` and `res`
- removed `android.defaults.buildfeatures.buildconfig` from `android/gradle.properties`
- enabled `buildConfig` only where needed for `react-native-vector-icons`
- verified `:app:assembleDebug` succeeds

## Daily Start Flow

### 1. Start Metro

```powershell
cmd /c npm start
```

### 2. Run Android

```powershell
cmd /c npx react-native run-android
```

### 3. If Metro prompt feels wrong again

Check the installed dependency tree:

```powershell
cmd /c npm ls react-native @react-navigation/native react-native-screens
```

If you see `invalid` or `extraneous`, rebuild local install:

```powershell
cmd /c rmdir /s /q node_modules
del package-lock.json
cmd /c npm install
```

## Verification Commands

```powershell
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm test
cmd /c npm run android:bundle
cd android
cmd /c .\gradlew.bat :app:assembleDebug --no-daemon --console=plain
```

## Next Hardening Work

1. Remove old AGP warnings like explicit old build tools declarations in native dependencies where possible.
2. Add a root `doctor` script that checks RN version consistency before launch.
3. Decide whether to stay on RN `0.73.x` for stability or perform a full planned upgrade later.
