package app.hold.focus

import android.app.AppOpsManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class HoldAppBlockerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  init {
    appContext = reactContext
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val snap = HoldStore.snapshot(reactContext)
      promise.resolve(
        Arguments.createMap().apply {
          putBoolean("usageAccess", hasUsageAccess())
          putBoolean("overlay", Settings.canDrawOverlays(reactContext))
          putBoolean("monitoring", snap.optBoolean("monitoring"))
          putInt("todayOpens", snap.optInt("todayOpens"))
          putInt("todayContinued", snap.optInt("todayContinued"))
          putInt("todayClosed", snap.optInt("todayClosed"))
          putBoolean("isPro", snap.optBoolean("isPro"))
          putString("plan", snap.optString("plan"))
          val pkgs = Arguments.createArray()
          HoldStore.getPackages(reactContext).forEach { pkgs.pushString(it) }
          putArray("packages", pkgs)
        }
      )
    } catch (e: Exception) {
      promise.reject("status", e)
    }
  }

  @ReactMethod
  fun getInstalledTargets(promise: Promise) {
    try {
      val arr = HoldTargets.installed(reactContext)
      val out = Arguments.createArray()
      for (i in 0 until arr.length()) {
        val obj = arr.getJSONObject(i)
        out.pushMap(
          Arguments.createMap().apply {
            putString("packageName", obj.getString("packageName"))
            putString("label", obj.getString("label"))
            putString("hint", obj.optString("hint"))
            putString("icon", obj.optString("icon"))
          }
        )
      }
      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("targets", e)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      val intent =
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("usage_settings", e)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    try {
      val intent =
        Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactContext.packageName}"),
          )
          .apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("overlay_settings", e)
    }
  }

  @ReactMethod
  fun startMonitoring(packages: ReadableArray, promise: Promise) {
    try {
      if (!hasUsageAccess()) {
        promise.reject("usage", "Usage access is off")
        return
      }
      if (!Settings.canDrawOverlays(reactContext)) {
        promise.reject("overlay", "Display over other apps is off")
        return
      }
      val list = buildList {
        for (i in 0 until packages.size()) {
          packages.getString(i)?.let { add(it) }
        }
      }
      if (list.isEmpty()) {
        promise.reject("packages", "Pick one app")
        return
      }
      if (!HoldStore.isPro(reactContext) && list.size > 1) {
        promise.reject("pro", "Free includes one app. Pro unlocks the rest.")
        return
      }
      HoldStore.setPackages(reactContext, list)
      HoldStore.setMonitoring(reactContext, true)
      HoldMonitorService.start(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("start", e)
    }
  }

  @ReactMethod
  fun stopMonitoring(promise: Promise) {
    try {
      HoldStore.setMonitoring(reactContext, false)
      HoldMonitorService.stop(reactContext)
      HoldOverlay.hide(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("stop", e)
    }
  }

  @ReactMethod
  fun setPro(plan: String, promise: Promise) {
    try {
      HoldStore.setPro(reactContext, true, plan)
      promise.resolve(HoldStore.snapshot(reactContext).toString())
    } catch (e: Exception) {
      promise.reject("pro", e)
    }
  }

  @ReactMethod
  fun clearPro(promise: Promise) {
    try {
      val packages = HoldStore.getPackages(reactContext).take(1)
      HoldStore.setPro(reactContext, false, "")
      HoldStore.setPackages(reactContext, packages)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("pro", e)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // NativeEventEmitter required stub
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // NativeEventEmitter required stub
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = reactContext.getSystemService(AppOpsManager::class.java) ?: return false
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName,
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName,
        )
      }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  companion object {
    const val NAME = "HoldAppBlocker"
    private var appContext: ReactApplicationContext? = null

    fun emit(action: String, packageName: String?, snapshot: JSONObject) {
      val ctx = appContext ?: return
      if (!ctx.hasActiveReactInstance()) return
      val map =
        Arguments.createMap().apply {
          putString("action", action)
          putString("packageName", packageName)
          putString("label", packageName?.let { HoldTargets.labelFor(it) })
          putInt("todayOpens", snapshot.optInt("todayOpens"))
          putInt("todayContinued", snapshot.optInt("todayContinued"))
          putInt("todayClosed", snapshot.optInt("todayClosed"))
        }
      ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("HoldEvent", map)
    }
  }
}
