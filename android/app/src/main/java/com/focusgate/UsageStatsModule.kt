package com.focusgate

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

/**
 * UsageStatsModule -- React Native bridge for Android UsageStatsManager.
 *
 * Exposed as NativeModules.UsageStats on the JS side.
 *
 * Contract:
 *   hasPermission()              -> Promise<Boolean>
 *   requestPermission()          -> Promise<void>   (never rejects; opens settings)
 *   getTodayUsage()              -> Promise<UsageRecord[]>
 *   getAppUsage(packageName)     -> Promise<UsageRecord>
 *
 * UsageRecord shape:
 *   { packageName: String, appName: String, usageMinutes: Int }
 *
 * Error policy: never reject on data queries -- resolve with empty/zero instead.
 * Only requestPermission() rejects if the Intent cannot be fired.
 */
class UsageStatsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UsageStats"

    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Could not open Usage Access Settings: ${e.message}")
        }
    }

    @ReactMethod
    fun getTodayUsage(promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val pm  = reactContext.packageManager
            val startTime = todayMidnightMillis()
            val endTime   = System.currentTimeMillis()
            val rawStats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            if (rawStats == null || rawStats.isEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }
            val deduped = rawStats
                .filter { it.totalTimeInForeground > 0 }
                .groupBy { it.packageName }
                .mapValues { (_, entries) -> entries.maxByOrNull { it.totalTimeInForeground }!! }
                .values
                .sortedByDescending { it.totalTimeInForeground }
                .take(50)
            val result = Arguments.createArray()
            for (stat in deduped) {
                val appName = resolveAppName(pm, stat.packageName)
                val map = Arguments.createMap().apply {
                    putString("packageName",  stat.packageName)
                    putString("appName",      appName)
                    putInt("usageMinutes",    (stat.totalTimeInForeground / 60_000L).toInt())
                }
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.resolve(Arguments.createArray())
        }
    }

    @ReactMethod
    fun getAppUsage(packageName: String, promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val startTime = todayMidnightMillis()
            val endTime   = System.currentTimeMillis()
            val rawStats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            val stat = rawStats
                ?.filter { it.packageName == packageName }
                ?.maxByOrNull { it.totalTimeInForeground }
            val usageMinutes = ((stat?.totalTimeInForeground ?: 0L) / 60_000L).toInt()
            val map = Arguments.createMap().apply {
                putString("packageName",  packageName)
                putInt("usageMinutes",    usageMinutes)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            val fallback = Arguments.createMap().apply {
                putString("packageName",  packageName)
                putInt("usageMinutes",    0)
            }
            promise.resolve(fallback)
        }
    }

    @ReactMethod
    fun getWeeklyAverageMinutes(packageName: String, promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val endTime = System.currentTimeMillis()
            val startTime = endTime - (7 * 24 * 60 * 60 * 1000L) // Last 7 days
            
            val rawStats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            
            if (rawStats == null || rawStats.isEmpty()) {
                promise.resolve(0)
                return
            }

            // Sum up total time for this package across all daily entries
            val totalTime = rawStats
                .filter { it.packageName == packageName }
                .sumOf { it.totalTimeInForeground }
            
            val dailyAverage = (totalTime / 7 / 60_000L).toInt()
            promise.resolve(dailyAverage)
        } catch (e: Exception) {
            promise.resolve(0)
        }
    }

    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val time = System.currentTimeMillis()
            val events = usm.queryEvents(time - 10_000, time)
            val event = android.app.usage.UsageEvents.Event()
            var lastPackage: String? = null
            
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastPackage = event.packageName
                }
            }
            promise.resolve(lastPackage ?: "")
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    private fun todayMidnightMillis(): Long {
        return Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE,      0)
            set(Calendar.SECOND,      0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    private fun resolveAppName(pm: PackageManager, packageName: String): String {
        return try {
            pm.getApplicationLabel(
                pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
            ).toString()
        } catch (e: Exception) {
            packageName.substringAfterLast('.')
        }
    }
}
