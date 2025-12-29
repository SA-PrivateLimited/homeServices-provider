package com.homeservices.provider

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * React Native module to control the Hooter Foreground Service
 */
class HooterServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "HooterServiceModule"
    }

    @ReactMethod
    fun startHooter(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, HooterForegroundService::class.java).apply {
                action = HooterForegroundService.ACTION_START_HOOTER
            }
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to start hooter service: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopHooter(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, HooterForegroundService::class.java).apply {
                action = HooterForegroundService.ACTION_STOP_HOOTER
            }
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to stop hooter service: ${e.message}", e)
        }
    }
}

