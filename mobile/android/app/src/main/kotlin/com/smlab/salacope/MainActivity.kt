package com.smlab.salacope

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Links and LightPay, handled here rather than by Flutter's own deep linking:
 * - an address of the site (App Link, notification) is handed to the app, which opens it on top of the current screen
 *   (Flutter's default replaces the whole history: a back then closed the app);
 * - LightPay always opens in its own task: its screens never end up inside Salacope's history, and coming back from it
 *   lands on the same Salacope screen (the activity is single-task).
 */
class MainActivity : FlutterActivity() {
    private var channel: MethodChannel? = null
    private var pending: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        pending = linkOf(intent)
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "salacope/links").also {
            it.setMethodCallHandler { call, result ->
                when (call.method) {
                    // The address that started the app (once).
                    "initialLink" -> {
                        result.success(pending)
                        pending = null
                    }
                    // A LightPay payment page, in the LightPay app if it is on the phone.
                    "openInLightPay" -> result.success(openInLightPay(call.argument<String>("url") ?: ""))
                    // The LightPay app itself (seller's wallet, withdrawals).
                    "launchLightPay" -> result.success(launchLightPay())
                    else -> result.notImplemented()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val link = linkOf(intent) ?: return
        channel?.invokeMethod("link", link)
    }

    private fun linkOf(intent: Intent?): String? =
        if (intent?.action == Intent.ACTION_VIEW) intent.dataString else null

    private fun openInLightPay(url: String): Boolean {
        if (url.isEmpty()) return false
        val view = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            .setPackage(LIGHTPAY)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            startActivity(view)
            true
        } catch (e: ActivityNotFoundException) {
            false
        }
    }

    private fun launchLightPay(): Boolean {
        val open = packageManager.getLaunchIntentForPackage(LIGHTPAY) ?: return false
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            startActivity(open)
            true
        } catch (e: ActivityNotFoundException) {
            false
        }
    }

    private companion object {
        const val LIGHTPAY = "com.smlab.lightpay"
    }
}
