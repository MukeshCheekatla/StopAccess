package com.stopaccess

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView

/**
 * OverlayManager — shows a full-screen block overlay when a blocked app is detected.
 *
 * Lifecycle:
 *   showOverlay(context, packageName)  — called from BlockerAccessibilityService
 *   dismissOverlay()                   — called when user taps "Go Back" or
 *                                        when the foreground app changes away
 *
 * Permissions required:
 *   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
 *   (declared in AndroidManifest.xml)
 *
 * The overlay uses TYPE_ACCESSIBILITY_OVERLAY so it can appear above all apps
 * without needing the draw-over-other-apps user permission on modern Android.
 */
object OverlayManager {

    private const val TAG = "StopAccess/OverlayManager"

    private var overlayView: View? = null
    private var windowManager: WindowManager? = null

    fun showOverlay(context: Context, blockedPackage: String) {
        if (overlayView != null) return // already showing

        try {
            val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            windowManager = wm

            val view = LayoutInflater.from(context)
                .inflate(R.layout.overlay_blocked, null)

            view.findViewById<TextView>(R.id.tv_blocked_app)?.text = blockedPackage

            view.findViewById<View>(R.id.btn_go_back)?.setOnClickListener {
                dismissOverlay()
                // Navigate user to the home screen
                val home = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(home)
            }

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                else
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            )
            // Make interactive so the "Go Back" button can be tapped
            params.flags = params.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE.inv()

            wm.addView(view, params)
            overlayView = view

            Log.i(TAG, "Overlay shown for: $blockedPackage")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show overlay: ${e.message}")
        }
    }

    fun dismissOverlay() {
        try {
            overlayView?.let {
                windowManager?.removeView(it)
                overlayView = null
                windowManager = null
                Log.i(TAG, "Overlay dismissed")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to dismiss overlay: ${e.message}")
        }
    }

    val isShowing: Boolean get() = overlayView != null
}
