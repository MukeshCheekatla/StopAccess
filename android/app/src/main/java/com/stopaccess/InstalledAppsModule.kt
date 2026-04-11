package com.stopaccess

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.util.concurrent.ConcurrentHashMap

class InstalledAppsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val iconCache = ConcurrentHashMap<String, String>()

    override fun getName() = "InstalledApps"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        // Run on a background thread to avoid jank on the UI thread
        Thread {
            try {
                val pm = reactApplicationContext.packageManager
                val intent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                
                val resolveInfos = pm.queryIntentActivities(intent, 0)
                
                // 4. Sorting: Alphabetic sort for better UX
                val sortedInfos = resolveInfos.sortedBy {
                    it.loadLabel(pm).toString().lowercase()
                }

                val result = Arguments.createArray()

                for (resolveInfo in sortedInfos) {
                    val pkg = resolveInfo.activityInfo.packageName
                    if (pkg == reactApplicationContext.packageName) continue

                    // 5. Filter system apps (Optional/Configurable)
                    // Showing only user-facing launcher apps. 
                    // To strictly filter only manual installs, we'd check FLAG_SYSTEM, 
                    // but usually, users want to control things like Chrome/YouTube too.

                    val label = resolveInfo.loadLabel(pm).toString()
                    
                    // 2. Caching: Avoid redundant bitmap generation
                    val base64 = iconCache[pkg] ?: run {
                        val icon = resolveInfo.loadIcon(pm)
                        val encoded = if (icon != null) iconToBase64(icon) else ""
                        if (encoded.isNotEmpty()) iconCache[pkg] = encoded
                        encoded
                    }

                    val map = Arguments.createMap().apply {
                        putString("packageName", pkg)
                        putString("appName", label)
                        putString("iconBase64", base64) 
                    }
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERROR_GETTING_APPS", e.message)
            }
        }.start()
    }

    @ReactMethod
    fun getIconForPackage(packageName: String, promise: Promise) {
        // Keep for specific single-package lookups if needed
        val cached = iconCache[packageName]
        if (cached != null) {
            promise.resolve(cached)
            return
        }

        try {
            val pm = reactApplicationContext.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)
            val icon: Drawable? = if (launchIntent != null) {
                val resolveInfo = pm.resolveActivity(launchIntent, 0)
                resolveInfo?.loadIcon(pm) ?: pm.getApplicationIcon(packageName)
            } else {
                pm.getApplicationIcon(packageName)
            }

            if (icon != null) {
                val base64 = iconToBase64(icon)
                iconCache[packageName] = base64
                promise.resolve(base64)
            } else {
                promise.reject("ICON_ERROR", "Could not find any icon for $packageName")
            }
        } catch (e: Exception) {
            promise.reject("ICON_ERROR", "Error: ${e.message}")
        }
    }

    private fun iconToBase64(drawable: Drawable): String {
        // 3. Reduce icon size: 96x96 is perfect for list items
        val size = 96 
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        
        val baos = ByteArrayOutputStream()
        // PNG 100 is high quality but larger; for 96x96 it's negligible and ensures crispness
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
        val byteArray = baos.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}
