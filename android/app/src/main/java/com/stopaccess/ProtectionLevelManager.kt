package com.stopaccess

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.view.accessibility.AccessibilityManager

/**
 * ProtectionLevelManager — computes and persists the current protection level.
 *
 * State matrix (from PROTECTION_ARCHITECTURE.md):
 *
 *   | Accessibility | DNS  | Level            |
 *   |---------------|------|------------------|
 *   | ON            | ON   | STRONG           |
 *   | ON            | OFF  | STANDARD         |
 *   | OFF           | ON   | WEAK (warning)   |
 *   | OFF           | OFF  | NONE (prompt)    |
 *
 * JS side reads "protection_level" from SharedPreferences via RuleEngineModule.
 */
object ProtectionLevelManager {

    private const val TAG = "StopAccess/ProtectionLevel"
    private const val KEY_LEVEL = "protection_level"
    private const val KEY_DNS_ENABLED = "dns_layer_enabled"

    enum class Level { STRONG, STANDARD, WEAK, NONE }

    /** Call this whenever Accessibility or DNS state may have changed. */
    fun recompute(context: Context): Level {
        val a11yOn = isAccessibilityServiceEnabled(context)
        val dnsOn = isDnsLayerEnabled(context)

        val level = when {
            a11yOn && dnsOn  -> Level.STRONG
            a11yOn && !dnsOn -> Level.STANDARD
            !a11yOn && dnsOn -> Level.WEAK
            else             -> Level.NONE
        }

        prefs(context).edit().putString(KEY_LEVEL, level.name).apply()
        Log.i(TAG, "Protection level: $level (a11y=$a11yOn, dns=$dnsOn)")
        return level
    }

    fun currentLevel(context: Context): Level {
        val raw = prefs(context).getString(KEY_LEVEL, Level.NONE.name) ?: Level.NONE.name
        return try { Level.valueOf(raw) } catch (e: Exception) { Level.NONE }
    }

    /** Called by RuleEngineModule when user connects / disconnects NextDNS. */
    fun setDnsEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_DNS_ENABLED, enabled).apply()
        recompute(context)
    }

    fun isDnsLayerEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_DNS_ENABLED, false)

    // ── Accessibility check ──────────────────────────────────────────────────

    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(
            AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        )
        return enabledServices.any { info ->
            info.resolveInfo.serviceInfo.packageName == context.packageName &&
            info.resolveInfo.serviceInfo.name == BlockerAccessibilityService::class.java.name
        }
    }

    // ── Warning message helpers (match PROTECTION_ARCHITECTURE.md wording) ───

    fun warningMessage(level: Level): String? = when (level) {
        Level.WEAK -> "Protection is weak. Enable Accessibility to restore full blocking."
        Level.NONE -> "Gate is not protecting you. Enable Accessibility Service to begin."
        else       -> null
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(RuleEngine.PREFS_NAME, Context.MODE_PRIVATE)
}
