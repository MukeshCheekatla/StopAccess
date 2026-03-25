package com.focusgate

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * UsageStatsPackage -- registers UsageStatsModule with the React Native bridge.
 *
 * Registration: already wired into MainApplication.kt via
 *   PackageList(this).packages.apply { add(UsageStatsPackage()) }
 */
class UsageStatsPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(UsageStatsModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
