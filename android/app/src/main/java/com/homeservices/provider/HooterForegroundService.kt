package com.homeservices.provider

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Foreground Service for playing hooter sound for job alerts
 * This service runs in the foreground and can play sounds even when app is in background
 */
class HooterForegroundService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var isPlaying = false
    private var vibrator: Vibrator? = null
    private val CHANNEL_ID = "HooterForegroundServiceChannel"
    private val NOTIFICATION_ID = 1001

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        
        // Initialize vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibrator = vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_HOOTER -> {
                startHooter()
            }
            ACTION_STOP_HOOTER -> {
                stopHooter()
            }
        }
        return START_STICKY // Restart service if killed
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Job Alert Hooter Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Plays hooter sound for incoming job alerts"
                setSound(null, null) // No sound for notification itself
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundNotification() {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Job Alert Active")
            .setContentText("Listening for new job alerts")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun startHooter() {
        if (isPlaying) {
            return // Already playing
        }

        try {
            // Start foreground notification
            startForegroundNotification()

            // Vibrate
            vibrate()

            // Load and play sound from res/raw/hooter.wav
            val resourceId = resources.getIdentifier("hooter", "raw", packageName)
            if (resourceId == 0) {
                android.util.Log.e("HooterService", "hooter.wav not found in res/raw")
                stopHooter()
                return
            }
            
            mediaPlayer = MediaPlayer.create(this, resourceId)
            
            mediaPlayer?.let { mp ->
                mp.setOnErrorListener { _, what, extra ->
                    android.util.Log.e("HooterService", "MediaPlayer error: what=$what, extra=$extra")
                    stopHooter()
                    false
                }
                
                mp.isLooping = true
                mp.setVolume(1.0f, 1.0f)
                mp.start()
                isPlaying = true
                
                android.util.Log.d("HooterService", "Hooter sound started successfully")
            } ?: run {
                android.util.Log.e("HooterService", "Failed to create MediaPlayer")
                stopHooter()
            }
        } catch (e: Exception) {
            android.util.Log.e("HooterService", "Error starting hooter", e)
            stopHooter()
        }
    }

    private fun stopHooter() {
        try {
            mediaPlayer?.let { mp ->
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.release()
            }
            mediaPlayer = null
            isPlaying = false
            
            // Stop foreground service
            stopForeground(true)
            stopSelf()
            
            android.util.Log.d("HooterService", "Hooter sound stopped")
        } catch (e: Exception) {
            android.util.Log.e("HooterService", "Error stopping hooter", e)
        }
    }

    private fun vibrate() {
        try {
            vibrator?.let { vib ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val pattern = longArrayOf(0, 500, 200, 500)
                    vib.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vib.vibrate(longArrayOf(0, 500, 200, 500), 0)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("HooterService", "Error vibrating", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopHooter()
    }

    companion object {
        const val ACTION_START_HOOTER = "com.homeservices.provider.START_HOOTER"
        const val ACTION_STOP_HOOTER = "com.homeservices.provider.STOP_HOOTER"
    }
}

