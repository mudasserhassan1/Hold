package app.hold.focus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class HoldMonitorService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val poll =
    object : Runnable {
      override fun run() {
        checkForeground()
        handler.postDelayed(this, 400L)
      }
    }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    handler.post(poll)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    HoldOverlay.hide(this)
    super.onDestroy()
  }

  private fun checkForeground() {
    if (!HoldStore.isMonitoring(this)) return
    if (HoldOverlay.visible) return
    val fg = foregroundPackage() ?: return
    if (fg == packageName) {
      lastPackage = fg
      return
    }
    if (fg == allowedPackage) {
      lastPackage = fg
      return
    }
    val watched = HoldStore.getPackages(this)
    if (fg in watched && fg != lastPackage) {
      lastPackage = fg
      allowedPackage = null
      val count = HoldStore.incrementOpen(this, fg)
      HoldAppBlockerModule.emit("shown", fg, HoldStore.snapshot(this))
      HoldOverlay.show(this, fg, count)
      return
    }
    lastPackage = fg
  }

  private fun foregroundPackage(): String? {
    val usm = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val events = usm.queryEvents(end - 4000L, end)
    val event = UsageEvents.Event()
    var last: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val isResume =
        event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
          event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
      if (isResume) last = event.packageName
    }
    return last
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Hold is on", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Runs while Hold watches the apps you chose"
        setShowBadge(false)
      }
    )
  }

  private fun buildNotification(): Notification {
    val launch =
      PendingIntent.getActivity(
        this,
        0,
        Intent(this, MainActivity::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Hold is watching")
      .setContentText("Pause screen is ready for the apps you selected")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setContentIntent(launch)
      .setOngoing(true)
      .setSilent(true)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "hold_monitor"
    private const val NOTIFICATION_ID = 71
    private var lastPackage: String? = null
    private var allowedPackage: String? = null

    fun allowSession(packageName: String?) {
      val pkg = packageName ?: HoldOverlay.currentPackage ?: lastPackage
      allowedPackage = pkg
      if (pkg != null) {
        lastPackage = pkg
      }
    }

    fun start(context: Context) {
      val intent = Intent(context, HoldMonitorService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, HoldMonitorService::class.java))
      allowedPackage = null
      lastPackage = null
    }
  }
}
