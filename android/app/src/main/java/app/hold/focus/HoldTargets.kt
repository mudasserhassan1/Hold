package app.hold.focus

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

object HoldTargets {
  val catalog =
    listOf(
      Triple("com.instagram.android", "Instagram", "Reels and Explore"),
      Triple("com.zhiliaoapp.musically", "TikTok", "For You"),
      Triple("com.ss.android.ugc.trill", "TikTok", "For You"),
      Triple("com.google.android.youtube", "YouTube", "Home and Shorts"),
      Triple("com.facebook.katana", "Facebook", "Feed and Reels"),
      Triple("com.snapchat.android", "Snapchat", "Stories and Spotlight"),
      Triple("com.reddit.frontpage", "Reddit", "Home feed"),
      Triple("com.twitter.android", "X", "For You"),
      Triple("com.instagram.barcelona", "Threads", "Feed"),
      Triple("com.whatsapp", "WhatsApp", "Status and chats"),
      Triple("com.facebook.orca", "Messenger", "Chats"),
      Triple("com.discord", "Discord", "Servers"),
      Triple("com.pinterest", "Pinterest", "Home feed"),
      Triple("com.linkedin.android", "LinkedIn", "Feed"),
      Triple("tv.twitch.android.app", "Twitch", "Live and clips"),
      Triple("com.android.chrome", "Chrome", "The open tab"),
    )

  fun installed(context: Context): JSONArray {
    val pm = context.packageManager
    val seen = mutableSetOf<String>()
    val arr = JSONArray()
    for ((pkg, label, hint) in catalog) {
      if (!isInstalled(pm, pkg) || !seen.add(label)) continue
      arr.put(
        JSONObject().apply {
          put("packageName", pkg)
          put("label", label)
          put("hint", hint)
          put("icon", iconPng(pm, pkg))
        }
      )
    }
    return arr
  }

  fun labelFor(packageName: String): String =
    catalog.firstOrNull { it.first == packageName }?.second ?: packageName

  private fun isInstalled(pm: PackageManager, packageName: String): Boolean =
    try {
      pm.getPackageInfo(packageName, 0)
      true
    } catch (_: PackageManager.NameNotFoundException) {
      false
    }

  private fun iconPng(pm: PackageManager, packageName: String): String {
    return try {
      val bitmap = drawableBitmap(pm.getApplicationIcon(packageName))
      val sized = Bitmap.createScaledBitmap(bitmap, 96, 96, true)
      val out = ByteArrayOutputStream()
      sized.compress(Bitmap.CompressFormat.PNG, 100, out)
      Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) {
      ""
    }
  }

  private fun drawableBitmap(drawable: Drawable): Bitmap {
    if (drawable is BitmapDrawable && drawable.bitmap != null) {
      return drawable.bitmap
    }
    val width = drawable.intrinsicWidth.coerceAtLeast(1)
    val height = drawable.intrinsicHeight.coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }
}
