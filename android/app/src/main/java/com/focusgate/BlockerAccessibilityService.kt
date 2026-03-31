package com.focusgate

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * BlockerAccessibilityService — the mandatory enforcement layer.
 *
 * How it works:
 *   1. Receives TYPE_WINDOW_STATE_CHANGED events (fires on every app switch).
 *   2. Extracts the foreground package name from the event.
 *   3. Asks RuleEngine.isBlocked() — single source of truth.
 *   4. If blocked → OverlayManager.showOverlay().
 *   5. If unblocked → OverlayManager.dismissOverlay() if visible.
 *
 * Lifecycle:
 *   onServiceConnected → recompute protection level.
 *   onInterrupt        → log only; Android will restart the service.
 *   onUnbind           → recompute protection level (will downgrade to WEAK/NONE).
 *
 * Declared in AndroidManifest.xml as an <accessibility-service>.
 * Configured via res/xml/accessibility_service_config.xml.
 */
class BlockerAccessibilityService : AccessibilityService() {

    private val TAG = "FocusGate/A11yService"

    override fun onServiceConnected() {
        super.onServiceConnected()

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100L
        }

        ProtectionLevelManager.recompute(applicationContext)
        Log.i(TAG, "Accessibility service connected. Level: ${ProtectionLevelManager.currentLevel(applicationContext)}")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = event.packageName?.toString() ?: return

        // Never block ourselves or the system UI
        if (pkg == packageName || pkg == "com.android.systemui") {
            OverlayManager.dismissOverlay()
            return
        }

        if (RuleEngine.isBlocked(applicationContext, pkg)) {
            if (!OverlayManager.isShowing) {
                Log.i(TAG, "Blocking: $pkg")
                OverlayManager.showOverlay(applicationContext, pkg)
            }
        } else {
            if (OverlayManager.isShowing) {
                OverlayManager.dismissOverlay()
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Service interrupted — Android will reconnect")
        OverlayManager.dismissOverlay()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        OverlayManager.dismissOverlay()
        ProtectionLevelManager.recompute(applicationContext)
        Log.w(TAG, "Service unbound — protection level downgraded")
        return super.onUnbind(intent)
    }
}
