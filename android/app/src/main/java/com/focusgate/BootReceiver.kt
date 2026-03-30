package com.focusgate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log

/**
 * BootReceiver — responds to BOOT_COMPLETED / QUICKBOOT_POWERON.
 *
 * Strategy: stamp a "reboot occurred" flag in SharedPreferences so that
 * when the React Native app next launches (user opens it or a foreground
 * service starts it) the JS engine can read the flag, call startRuleEngine(),
 * and clear the flag.
 *
 * We deliberately do NOT relaunch the main Activity here:
 *  - Android 10+ blocks background activity launches.
 *  - Launching the UI on boot is disruptive to the user.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        const val PREFS_NAME = "focusgate_prefs"
        const val KEY_REBOOT_PENDING = "reboot_recovery_pending"
        private const val TAG = "FocusGate/BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        Log.i(TAG, "Device boot detected — flagging recovery pending")

        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_REBOOT_PENDING, true).apply()
    }
}
