package com.stopaccess

import android.os.Bundle
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    private var keepSplashScreen = true

    override fun onCreate(savedInstanceState: Bundle?) {
        // Handle the splash screen transition for Android 12+
        val splashScreen = installSplashScreen()
        
        // Keep the native splash screen (with the Shield Icon) visible 
        // until the JS engine is actually starting or a safety timeout occurs.
        // This eliminates the 'Blank Black' period during Metro bundle loading.
        splashScreen.setKeepOnScreenCondition { keepSplashScreen }
        
        // Safety timeout: stop being 'stuck' on splash if JS takes too long
        // In debug mode, this nicely covers the Metro fetch time.
        Handler(Looper.getMainLooper()).postDelayed({
            keepSplashScreen = false
        }, 3500) // Stay visible for 3.5s to cover the loading gap

        super.onCreate(null)
    }

    override fun getMainComponentName(): String = "StopAccess"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
            override fun createRootView(): com.facebook.react.ReactRootView {
                val rootView = super.createRootView()
                // Set the root view background to match our theme (#05050A)
                rootView.setBackgroundColor(Color.parseColor("#05050A"))
                
                // When the first React view is finally created, we can safely
                // let the native splash screen hide.
                keepSplashScreen = false
                
                return rootView
            }
        }
}
