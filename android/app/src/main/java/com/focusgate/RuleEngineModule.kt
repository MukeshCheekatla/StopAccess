package com.focusgate

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * RuleEngineModule — React Native bridge for the protection system.
 *
 * Exposed as NativeModules.RuleEngine on the JS side.
 *
 * API:
 *   setBlockedPackages(packages: string[])   → void   Write rules
 *   getBlockedPackages()                     → Promise<string[]>
 *   getProtectionLevel()                     → Promise<string>  "STRONG"|"STANDARD"|"WEAK"|"NONE"
 *   getProtectionWarning()                   → Promise<string|null>
 *   setDnsEnabled(enabled: boolean)          → void
 *   isDnsEnabled()                           → Promise<boolean>
 *   isAccessibilityEnabled()                 → Promise<boolean>
 *   openAccessibilitySettings()              → void
 *   recomputeProtectionLevel()               → Promise<string>
 */
class RuleEngineModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "RuleEngine"

    @ReactMethod
    fun setBlockedPackages(packages: ReadableArray) {
        val set = (0 until packages.size()).map { packages.getString(it) }.toSet()
        RuleEngine.setBlockedPackages(ctx, set)
    }

    @ReactMethod
    fun getBlockedPackages(promise: Promise) {
        try {
            val arr = com.facebook.react.bridge.Arguments.createArray()
            RuleEngine.getBlockedPackages(ctx).forEach { arr.pushString(it) }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("RULE_ENGINE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getProtectionLevel(promise: Promise) {
        promise.resolve(ProtectionLevelManager.currentLevel(ctx).name)
    }

    @ReactMethod
    fun recomputeProtectionLevel(promise: Promise) {
        val level = ProtectionLevelManager.recompute(ctx)
        promise.resolve(level.name)
    }

    @ReactMethod
    fun getProtectionWarning(promise: Promise) {
        val level = ProtectionLevelManager.currentLevel(ctx)
        promise.resolve(ProtectionLevelManager.warningMessage(level))
    }

    @ReactMethod
    fun setDnsEnabled(enabled: Boolean) {
        ProtectionLevelManager.setDnsEnabled(ctx, enabled)
    }

    @ReactMethod
    fun isDnsEnabled(promise: Promise) {
        promise.resolve(ProtectionLevelManager.isDnsLayerEnabled(ctx))
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        promise.resolve(ProtectionLevelManager.isAccessibilityServiceEnabled(ctx))
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            ctx.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }
}
