# Android Recovery Plan
> Updated: 30 Mar 2026

## Use This File For

- Android build failures
- Metro / run-android confusion
- Gradle wrapper drift
- local environment recovery

## Known Recovery Pattern

The most common failure mode has been local environment drift, not app logic:

- mismatched React Native install
- wrong Gradle version
- stale generated assets
- IDE using the wrong Java or Gradle launcher

## Daily Start Flow

1. Start Metro
2. Start emulator or connect device
3. Run Android from a second terminal

```powershell
cmd /c npm start
cmd /c npx react-native run-android
```

## If Android Stops Working

### Check dependency alignment

```powershell
cmd /c npm ls react-native @react-navigation/native react-native-screens
```

### Reinstall if needed

```powershell
cmd /c rmdir /s /q node_modules
del package-lock.json
cmd /c npm install
```

### Verify Gradle wrapper

```powershell
cd android
cmd /c gradlew.bat --version
```

### Build directly

```powershell
cd android
cmd /c gradlew.bat :app:assembleDebug --no-daemon --console=plain
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
