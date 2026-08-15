package app.hold.focus

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object HoldStore {
  private const val PREFS = "hold_store"
  private const val KEY_PACKAGES = "packages"
  private const val KEY_MONITORING = "monitoring"
  private const val KEY_DAY = "day"
  private const val KEY_OPENS = "opens"
  private const val KEY_CONTINUED = "continued"
  private const val KEY_CLOSED = "closed"
  private const val KEY_PRO = "is_pro"
  private const val KEY_PLAN = "plan"

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun today(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  private fun rollDay(context: Context) {
    val p = prefs(context)
    if (p.getString(KEY_DAY, "") == today()) return
    p.edit()
      .putString(KEY_DAY, today())
      .putString(KEY_OPENS, JSONObject().toString())
      .putInt(KEY_CONTINUED, 0)
      .putInt(KEY_CLOSED, 0)
      .apply()
  }

  fun setPackages(context: Context, packages: List<String>) {
    prefs(context).edit().putString(KEY_PACKAGES, JSONArray(packages).toString()).apply()
  }

  fun getPackages(context: Context): List<String> {
    val raw = prefs(context).getString(KEY_PACKAGES, "[]") ?: "[]"
    val arr = JSONArray(raw)
    return buildList {
      for (i in 0 until arr.length()) add(arr.getString(i))
    }
  }

  fun setMonitoring(context: Context, on: Boolean) {
    prefs(context).edit().putBoolean(KEY_MONITORING, on).apply()
  }

  fun isMonitoring(context: Context): Boolean = prefs(context).getBoolean(KEY_MONITORING, false)

  fun incrementOpen(context: Context, packageName: String): Int {
    rollDay(context)
    val p = prefs(context)
    val opens = JSONObject(p.getString(KEY_OPENS, "{}") ?: "{}")
    val next = opens.optInt(packageName, 0) + 1
    opens.put(packageName, next)
    p.edit().putString(KEY_OPENS, opens.toString()).apply()
    return next
  }

  fun todayOpenTotal(context: Context): Int {
    rollDay(context)
    val opens = JSONObject(prefs(context).getString(KEY_OPENS, "{}") ?: "{}")
    var total = 0
    opens.keys().forEach { total += opens.optInt(it, 0) }
    return total
  }

  fun recordContinued(context: Context) {
    rollDay(context)
    val p = prefs(context)
    p.edit().putInt(KEY_CONTINUED, p.getInt(KEY_CONTINUED, 0) + 1).apply()
  }

  fun recordClosed(context: Context) {
    rollDay(context)
    val p = prefs(context)
    p.edit().putInt(KEY_CLOSED, p.getInt(KEY_CLOSED, 0) + 1).apply()
  }

  fun isPro(context: Context): Boolean = prefs(context).getBoolean(KEY_PRO, false)

  fun getPlan(context: Context): String = prefs(context).getString(KEY_PLAN, "") ?: ""

  fun setPro(context: Context, on: Boolean, plan: String) {
    prefs(context)
      .edit()
      .putBoolean(KEY_PRO, on)
      .putString(KEY_PLAN, if (on) plan else "")
      .apply()
  }

  fun snapshot(context: Context): JSONObject {
    rollDay(context)
    val p = prefs(context)
    return JSONObject().apply {
      put("monitoring", isMonitoring(context))
      put("packages", JSONArray(getPackages(context)))
      put("todayOpens", todayOpenTotal(context))
      put("todayContinued", p.getInt(KEY_CONTINUED, 0))
      put("todayClosed", p.getInt(KEY_CLOSED, 0))
      put("day", p.getString(KEY_DAY, today()))
      put("isPro", isPro(context))
      put("plan", getPlan(context))
    }
  }
}
