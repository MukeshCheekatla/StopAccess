# Project Structure

```text
|-- .vscode
|   \-- settings.json
|-- android
|   |-- app
|   |   |-- src
|   |   |   \-- main
|   |   |       |-- assets
|   |   |       |-- java
|   |   |       |   \-- com
|   |   |       |       \-- focusgate
|   |   |       |           |-- BootReceiver.kt
|   |   |       |           |-- InstalledAppsModule.kt
|   |   |       |           |-- InstalledAppsPackage.kt
|   |   |       |           |-- MainActivity.kt
|   |   |       |           |-- MainApplication.kt
|   |   |       |           |-- UsageStatsModule.kt
|   |   |       |           \-- UsageStatsPackage.kt
|   |   |       |-- res
|   |   |       |   |-- drawable-hdpi
|   |   |       |   |-- drawable-mdpi
|   |   |       |   |-- drawable-xhdpi
|   |   |       |   |-- drawable-xxhdpi
|   |   |       |   |-- drawable-xxxhdpi
|   |   |       |   |-- mipmap-xxxhdpi
|   |   |       |   |   \-- ic_launcher.png
|   |   |       |   \-- values
|   |   |       |       |-- strings.xml
|   |   |       |       \-- styles.xml
|   |   |       \-- AndroidManifest.xml
|   |   |-- build.gradle
|   |   |-- debug.keystore
|   |   \-- proguard-rules.pro
|   |-- gradle
|   |   \-- wrapper
|   |       |-- gradle-wrapper.jar
|   |       \-- gradle-wrapper.properties
|   |-- build.gradle
|   |-- gradle.properties
|   |-- gradlew.bat
|   |-- local.properties
|   \-- settings.gradle
|-- extension
|   |-- assets
|   |   \-- icon.png
|   |-- src
|   |   |-- background
|   |   |   |-- dnrAdapter.js
|   |   |   |-- lifecycle.js
|   |   |   \-- platformAdapter.js
|   |   |-- dashboard
|   |   |   \-- index.html
|   |   |-- lib
|   |   |   |-- appCatalog.js
|   |   |   \-- logger.js
|   |   |-- popup
|   |   |   |-- popup.html
|   |   |   \-- popup.js
|   |   \-- screens
|   |       |-- AppsScreen.js
|   |       |-- DashboardScreen.js
|   |       |-- FocusScreen.js
|   |       |-- InsightsScreen.js
|   |       |-- OnboardingScreen.js
|   |       |-- ScheduleScreen.js
|   |       \-- SettingsScreen.js
|   |-- build.js
|   |-- manifest.json
|   |-- package-lock.json
|   \-- package.json
|-- packages
|   |-- core
|   |   |-- src
|   |   |   |-- api.ts
|   |   |   |-- domains.ts
|   |   |   |-- engine.ts
|   |   |   |-- index.ts
|   |   |   \-- insights.ts
|   |   \-- package.json
|   |-- state
|   |   |-- src
|   |   |   |-- index.ts
|   |   |   |-- insights.ts
|   |   |   |-- rules.ts
|   |   |   |-- schedules.ts
|   |   |   \-- sync.ts
|   |   \-- package.json
|   |-- sync
|   |   |-- src
|   |   |   |-- index.ts
|   |   |   \-- syncAdapter.ts
|   |   \-- package.json
|   \-- types
|       |-- src
|       |   \-- index.ts
|       \-- package.json
|-- scripts
|   |-- check-extension.mjs
|   \-- doctor.mjs
|-- src
|   |-- __tests__
|   |   |-- ruleEngine.test.ts
|   |   \-- usageStats.test.ts
|   |-- api
|   |   \-- nextdns.ts
|   |-- components
|   |   |-- AppIcon.tsx
|   |   |-- AppIconImage.tsx
|   |   |-- AppPickerModal.tsx
|   |   |-- AutoSetupModal.tsx
|   |   |-- PinGate.tsx
|   |   \-- theme.ts
|   |-- data
|   |   \-- appDomains.json
|   |-- engine
|   |-- modules
|   |   |-- installedApps.ts
|   |   \-- usageStats.ts
|   |-- navigation
|   |   \-- AppNavigator.tsx
|   |-- screens
|   |   |-- AppsScreen.tsx
|   |   |-- DashboardScreen.tsx
|   |   |-- FocusScreen.tsx
|   |   |-- InsightsScreen.tsx
|   |   |-- OnboardingScreen.tsx
|   |   |-- ScheduleScreen.tsx
|   |   \-- SettingsScreen.tsx
|   |-- services
|   |   |-- keychain.ts
|   |   |-- logger.ts
|   |   \-- notifications.ts
|   |-- store
|   |   |-- storageAdapter.ts
|   |   |-- strictMode.ts
|   |   \-- syncState.ts
|   |-- types
|   |   \-- index.ts
|   \-- utils
|       |-- text.ts
|       \-- time.ts
|-- types
|   \-- react-native-vector-icons.d.ts
|-- .env.example
|-- .eslintignore
|-- .eslintrc.js
|-- .gitignore
|-- .prettierrc
|-- app.json
|-- App.tsx
|-- babel.config.js
|-- build_fix.ps1
|-- index.js
|-- jest.config.js
|-- jest.rn-mock.js
|-- jest.setup.js
|-- metro.config.js
|-- package-lock.json
|-- package.json
|-- react-native.config.js
|-- README.md
\-- tsconfig.json
```
