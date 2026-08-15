package app.hold.focus

import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.CountDownTimer
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.widget.doAfterTextChanged

object HoldOverlay {
  @Volatile var visible: Boolean = false
    private set

  private var root: View? = null
  private var timer: CountDownTimer? = null
  private var waited: Boolean = false
  var currentPackage: String? = null
    private set

  fun show(context: Context, packageName: String, openCount: Int) {
    if (visible) return
    if (!Settings.canDrawOverlays(context)) return

    val app = context.applicationContext
    val inflater = LayoutInflater.from(app)
    val view = inflater.inflate(R.layout.hold_overlay, null)
    val title = view.findViewById<TextView>(R.id.hold_title)
    val body = view.findViewById<TextView>(R.id.hold_body)
    val timerView = view.findViewById<TextView>(R.id.hold_timer)
    val timerLabel = view.findViewById<TextView>(R.id.hold_timer_label)
    val continueBtn = view.findViewById<Button>(R.id.hold_continue)
    val closeBtn = view.findViewById<Button>(R.id.hold_close)
    val prompt = view.findViewById<EditText>(R.id.hold_prompt)
    val keys = view.findViewById<LinearLayout>(R.id.hold_keys)
    val label = HoldTargets.labelFor(packageName)
    val waitSeconds = waitFor(openCount)
    val needsType = openCount >= 3
    waited = false

    title.text = "Pause $label."
    body.text =
      when {
        openCount <= 1 -> "You opened this without deciding. Wait a few seconds."
        openCount == 2 -> "Second time today. Scrolling, or something specific?"
        else -> "Type open if you still want in. Go Home is the win."
      }
    prompt.visibility = if (needsType) View.VISIBLE else View.GONE
    keys.visibility = if (needsType) View.VISIBLE else View.GONE
    continueBtn.visibility = View.GONE
    continueBtn.isEnabled = false
    timerView.text = waitSeconds.toString()
    timerLabel.text = if (waitSeconds == 1) "second" else "seconds"

    if (needsType) {
      bindTypeKeys(keys, prompt)
      prompt.doAfterTextChanged { refreshContinue(continueBtn, prompt, needsType) }
      prompt.setOnEditorActionListener { _, actionId, _ ->
        if (actionId == EditorInfo.IME_ACTION_DONE && canContinue(prompt, needsType)) {
          continueIntoApp(app)
          true
        } else {
          false
        }
      }
    }

    closeBtn.setOnClickListener { close(app) }
    continueBtn.setOnClickListener {
      if (canContinue(prompt, needsType)) {
        continueIntoApp(app)
      }
    }

    val params =
      WindowManager.LayoutParams(
          WindowManager.LayoutParams.MATCH_PARENT,
          WindowManager.LayoutParams.MATCH_PARENT,
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
          PixelFormat.TRANSLUCENT,
        )
        .apply {
          gravity = Gravity.TOP or Gravity.START
          softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            layoutInDisplayCutoutMode =
              WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
          }
        }

    val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    wm.addView(view, params)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      view.setOnApplyWindowInsetsListener { v, insets ->
        val bars = insets.getInsets(WindowInsets.Type.systemBars())
        v.setPadding(0, bars.top, 0, bars.bottom)
        insets
      }
    }
    root = view
    currentPackage = packageName
    visible = true

    timer?.cancel()
    timer =
      object : CountDownTimer(waitSeconds * 1000L, 250L) {
          override fun onTick(millisUntilFinished: Long) {
            val left = ((millisUntilFinished + 999) / 1000).toInt().coerceAtLeast(1)
            timerView.text = left.toString()
            timerLabel.text = if (left == 1) "second" else "seconds"
            refreshContinue(continueBtn, prompt, needsType)
          }

          override fun onFinish() {
            waited = true
            timerView.text = "0"
            timerLabel.text = "seconds"
            refreshContinue(continueBtn, prompt, needsType)
          }
        }
        .start()
  }

  fun hide(context: Context) {
    timer?.cancel()
    timer = null
    waited = false
    val view = root ?: run {
      visible = false
      currentPackage = null
      return
    }
    try {
      val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
      wm.removeView(view)
    } catch (_: Exception) {
    }
    root = null
    visible = false
    currentPackage = null
  }

  private fun bindTypeKeys(row: LinearLayout, prompt: EditText) {
    row.removeAllViews()
    val letters = listOf("o", "p", "e", "n")
    letters.forEach { letter ->
      row.addView(typeKey(row.context, letter) { prompt.append(letter) }, keyParams())
    }
    row.addView(
      typeKey(row.context, "⌫") {
        val value = prompt.text?.toString().orEmpty()
        if (value.isNotEmpty()) {
          prompt.setText(value.dropLast(1))
          prompt.setSelection(prompt.text?.length ?: 0)
        }
      },
      keyParams(),
    )
  }

  private fun typeKey(context: Context, label: String, onClick: () -> Unit): Button {
    return Button(context).apply {
      text = label
      textSize = 16f
      isAllCaps = false
      minHeight = (48 * context.resources.displayMetrics.density).toInt()
      backgroundTintList = ColorStateList.valueOf(Color.parseColor("#E7E5E4"))
      setTextColor(Color.parseColor("#1C1917"))
      setOnClickListener { onClick() }
    }
  }

  private fun keyParams(): LinearLayout.LayoutParams =
    LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
      marginStart = 4
      marginEnd = 4
    }

  private fun canContinue(prompt: EditText, needsType: Boolean): Boolean {
    val typed =
      !needsType || prompt.text?.toString()?.trim()?.equals("open", ignoreCase = true) == true
    return waited && typed
  }

  private fun refreshContinue(button: Button, prompt: EditText, needsType: Boolean) {
    val ready = canContinue(prompt, needsType)
    button.visibility = if (ready) View.VISIBLE else View.GONE
    button.isEnabled = ready
    button.isClickable = ready
    button.text = "Continue"
  }

  private fun waitFor(openCount: Int): Int =
    when {
      openCount <= 1 -> 5
      openCount == 2 -> 10
      else -> 15
    }

  private fun continueIntoApp(context: Context) {
    val pkg = currentPackage
    HoldStore.recordContinued(context)
    HoldMonitorService.allowSession(pkg)
    HoldAppBlockerModule.emit("continued", pkg, HoldStore.snapshot(context))
    hide(context)
  }

  private fun close(context: Context) {
    HoldStore.recordClosed(context)
    HoldAppBlockerModule.emit("closed", currentPackage, HoldStore.snapshot(context))
    hide(context)
    val home =
      Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
    context.startActivity(home)
  }
}
