package com.focusgate

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
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

    @ReactMethod
    fun isOverlayEnabled(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(ctx))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openOverlaySettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    data = Uri.parse("package:${ctx.packageName}")
                }
                ctx.startActivity(intent)
            } catch (e: Exception) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                ctx.startActivity(intent)
            }
        }
    }

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            promise.resolve(manager.areNotificationsEnabled())
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openNotificationSettings() {
        val intent = Intent().apply {
            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
                    action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
                }
                else -> {
                    action = "android.settings.APP_NOTIFICATION_SETTINGS"
                    putExtra("app_package", ctx.packageName)
                    putExtra("app_uid", ctx.applicationInfo.uid)
                }
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(intent)
    }

    @ReactMethod
    fun openPrivateDnsSettings(promise: Promise) {
        try {
            val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                "android.settings.DNS_SETTINGS"
            } else {
                Settings.ACTION_WIRELESS_SETTINGS
            }
            val intent = Intent(action).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            ctx.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            ctx.startActivity(intent)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun showOverlay(packageName: String) {
        OverlayManager.showOverlay(ctx, packageName)
    }

    @ReactMethod
    fun hideOverlay() {
        OverlayManager.dismissOverlay()
    }
}
