package com.stopaccess

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONArray

/**
 * RuleEngine — single source of truth for blocking rules.
 *
 * Both the Accessibility layer (app blocking) and the DNS layer (NextDNS)
 * must read from this and ONLY this. Never maintain a second rule list.
 *
 * Rules are written by the React Native JS side via RuleEngineModule and
 * stored in SharedPreferences as a JSON array of package names.
 *
 * Key used by the JS bridge: "blocked_packages"  (array of strings)
 */
object RuleEngine {

    private const val TAG = "StopAccess/RuleEngine"
    const val PREFS_NAME = "StopAccess_prefs"
    const val KEY_BLOCKED_PACKAGES = "blocked_packages"

    /** Returns true if [packageName] is in the active blocklist. */
    fun isBlocked(context: Context, packageName: String): Boolean {
        val blocked = getBlockedPackages(context)
        val result = packageName in blocked
        if (result) {
            Log.d(TAG, "Block Match Found: $packageName")
        }
        return result
    }

    /** Returns the full set of currently blocked package names. */
    fun getBlockedPackages(context: Context): Set<String> {
        val prefs = prefs(context)
        val json = prefs.getString(KEY_BLOCKED_PACKAGES, "[]") ?: "[]"
        Log.d(TAG, "Native Blocklist Content: $json")
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }.toSet()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse blocked packages: ${e.message}")
            emptySet()
        }
    }

    /** Overwrites the blocklist. Called by RuleEngineModule from JS. */
    fun setBlockedPackages(context: Context, packages: Set<String>) {
        val json = JSONArray(packages.toList()).toString()
        prefs(context).edit().putString(KEY_BLOCKED_PACKAGES, json).apply()
        Log.i(TAG, "Blocklist updated: ${packages.size} packages")
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
