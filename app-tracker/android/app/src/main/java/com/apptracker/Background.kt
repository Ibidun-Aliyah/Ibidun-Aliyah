package com.apptracker

import android.Manifest
import android.app.AlarmManager
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifier.createChannels(this)
        Sync.schedule(this)
    }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

object Sync {
    private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    fun schedule(ctx: Context) {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).setConstraints(online).build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("sync", ExistingPeriodicWorkPolicy.KEEP, req)
    }

    fun now(ctx: Context) {
        val req = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(online).build()
        WorkManager.getInstance(ctx).enqueueUniqueWork("sync-now", ExistingWorkPolicy.REPLACE, req)
    }

    /** Marks something handled right away on the phone and sends it to the server in the background. */
    fun sendAction(ctx: Context, action: String, id: String) {
        val prefs = Prefs(ctx)
        prefs.locallyHandled = prefs.locallyHandled + id
        Notifier.refreshAll(ctx, prefs.state())
        TrackerWidget.update(ctx)
        val req = OneTimeWorkRequestBuilder<ActionWorker>()
            .setConstraints(online)
            .setInputData(workDataOf("action" to action, "id" to id))
            .build()
        WorkManager.getInstance(ctx).enqueue(req)
    }

    /** Fetch, cache, notify, update widget. Returns null on success or an error message. */
    suspend fun run(ctx: Context): String? = withContext(Dispatchers.IO) {
        val prefs = Prefs(ctx)
        if (!prefs.configured) return@withContext "Not set up yet"
        try {
            prefs.stateJson = Api.fetchState(prefs)
            prefs.lastSync = System.currentTimeMillis()
            prefs.lastError = ""
            // Anything the server now knows about no longer needs a local override.
            val server = TrackerState.parse(prefs.stateJson)
            prefs.locallyHandled = prefs.locallyHandled.filter { id ->
                server.alerts.any { it.id == id && !it.acked } || server.actions.any { it.id == id && !it.done }
            }.toSet()
            Notifier.refreshAll(ctx, prefs.state())
            TrackerWidget.update(ctx)
            null
        } catch (e: Exception) {
            prefs.lastError = e.message ?: e.javaClass.simpleName
            TrackerWidget.update(ctx)
            prefs.lastError
        }
    }
}

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        Sync.run(applicationContext)
        return Result.success()
    }
}

class ActionWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val action = inputData.getString("action") ?: return@withContext Result.failure()
        val id = inputData.getString("id") ?: return@withContext Result.failure()
        try {
            Api.post(Prefs(applicationContext), action, mapOf("id" to id))
            Sync.run(applicationContext)
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 8) Result.retry() else Result.failure()
        }
    }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

object Notifier {
    const val CH_CRITICAL = "critical"
    const val CH_IMPORTANT = "important"
    private const val REPOST_DELAY_MS = 10 * 60 * 1000L

    fun createChannels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_CRITICAL, "Critical: decisions & deadlines", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Acceptances, interview invites and deadlines. Keeps coming back until you mark it handled."
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 800)
                setBypassDnd(true)
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_IMPORTANT, "Application updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Progress updates, response windows and silence check-ins."
            }
        )
    }

    fun canNotify(ctx: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun nid(alertId: String) = alertId.hashCode()

    /** Show every open alert that isn't showing, and remove ones that were handled. */
    fun refreshAll(ctx: Context, state: TrackerState) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        val prefs = Prefs(ctx)
        val active = nm.activeNotifications.map { it.id }.toSet()
        val open = state.openAlerts
        val openIds = open.map { nid(it.id) }.toSet()
        // Clear notifications for alerts handled elsewhere (e.g. the WhatsApp link).
        state.alerts.filter { it.acked }.forEach { if (nid(it.id) in active) nm.cancel(nid(it.id)) }
        active.filter { it !in openIds && it != 0 }.forEach { nm.cancel(it) }

        val shown = prefs.shownAlerts.toMutableSet()
        for (a in open) {
            val first = a.id !in shown
            when {
                first -> show(ctx, a, state, fullScreen = a.isCritical)
                a.isCritical && nid(a.id) !in active -> show(ctx, a, state, fullScreen = false)
            }
            shown += a.id
        }
        // Keep the "shown" set from growing forever.
        prefs.shownAlerts = shown.filter { id -> state.alerts.any { it.id == id } }.toSet()
    }

    fun show(ctx: Context, a: Alert, state: TrackerState, fullScreen: Boolean) {
        if (!canNotify(ctx)) return
        val id = nid(a.id)
        val caseName = state.case(a.caseId)?.name.orEmpty()
        val open = PendingIntent.getActivity(
            ctx, id, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val b = NotificationCompat.Builder(ctx, if (a.isCritical) CH_CRITICAL else CH_IMPORTANT)
            .setSmallIcon(R.drawable.ic_notify)
            .setColor(ContextCompat.getColor(ctx, R.color.brand))
            .setContentTitle(a.title)
            .setContentText(a.body.ifBlank { caseName })
            .setStyle(NotificationCompat.BigTextStyle().bigText(a.body).setSummaryText(caseName))
            .setContentIntent(open)
            .setAutoCancel(!a.isCritical)
            .addAction(0, "✅ Handled", actionIntent(ctx, NotificationActionReceiver.ACK, a.id, id))

        if (a.link.isNotBlank()) {
            val email = PendingIntent.getActivity(
                ctx, id + 1, Intent(Intent.ACTION_VIEW, Uri.parse(a.link)),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            b.addAction(0, "📧 Open email", email)
        }

        if (a.isCritical) {
            b.setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setOngoing(true) // can't be swiped on Android ≤13; on 14+ it comes back (see deleteIntent)
                .setDeleteIntent(
                    PendingIntent.getBroadcast(
                        ctx, id + 2, Intent(ctx, RepostReceiver::class.java).putExtra("alert", a.id),
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
                    )
                )
            if (fullScreen) {
                val fs = PendingIntent.getActivity(
                    ctx, id + 3,
                    Intent(ctx, AlertActivity::class.java).putExtra("alert", a.id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
                )
                b.setFullScreenIntent(fs, true)
            }
        } else {
            b.setPriority(NotificationCompat.PRIORITY_DEFAULT).setOnlyAlertOnce(true)
        }
        try {
            NotificationManagerCompat.from(ctx).notify(id, b.build())
        } catch (_: SecurityException) {
        }
    }

    private fun actionIntent(ctx: Context, action: String, alertId: String, nid: Int): PendingIntent =
        PendingIntent.getBroadcast(
            ctx, nid + 4,
            Intent(ctx, NotificationActionReceiver::class.java).setAction(action).putExtra("alert", alertId),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    /** Swiped away without "Handled"? Bring it back in 10 minutes. */
    fun scheduleRepost(ctx: Context, alertId: String) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(
            ctx, nid(alertId) + 5,
            Intent(ctx, RepostReceiver::class.java).setAction(RepostReceiver.FIRE).putExtra("alert", alertId),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + REPOST_DELAY_MS, pi)
    }
}

class NotificationActionReceiver : BroadcastReceiver() {
    companion object { const val ACK = "com.apptracker.ACK" }

    override fun onReceive(ctx: Context, intent: Intent) {
        val alertId = intent.getStringExtra("alert") ?: return
        if (intent.action == ACK) {
            ctx.getSystemService(NotificationManager::class.java).cancel(Notifier.nid(alertId))
            Sync.sendAction(ctx, "ack", alertId)
        }
    }
}

class RepostReceiver : BroadcastReceiver() {
    companion object { const val FIRE = "com.apptracker.REPOST" }

    override fun onReceive(ctx: Context, intent: Intent) {
        val alertId = intent.getStringExtra("alert") ?: return
        if (intent.action == FIRE) {
            val state = Prefs(ctx).state()
            val a = state.openAlerts.firstOrNull { it.id == alertId } ?: return
            Notifier.show(ctx, a, state, fullScreen = false)
        } else {
            // Delete intent: the user swiped it away. If it's still unhandled, bring it back later.
            if (Prefs(ctx).state().openAlerts.any { it.id == alertId }) Notifier.scheduleRepost(ctx, alertId)
        }
    }
}

// ---------------------------------------------------------------------------
// Home-screen widget
// ---------------------------------------------------------------------------

class TrackerWidget : AppWidgetProvider() {
    companion object {
        const val REFRESH = "com.apptracker.WIDGET_REFRESH"

        fun update(ctx: Context) {
            val mgr = AppWidgetManager.getInstance(ctx)
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, TrackerWidget::class.java))
            if (ids.isNotEmpty()) mgr.updateAppWidget(ids, build(ctx))
        }

        private fun build(ctx: Context): RemoteViews {
            val prefs = Prefs(ctx)
            val s = prefs.state()
            val v = RemoteViews(ctx.packageName, R.layout.widget)
            val lines = mutableListOf<Pair<String, Boolean>>()

            s.openAlerts.filter { it.isCritical }.forEach { lines += ("🚨 " + it.title) to true }
            s.openActions.forEach { a ->
                val left = Time.countdown(a.deadline, s.zone)
                val urgent = (Time.hoursLeft(a.deadline, s.zone) ?: Long.MAX_VALUE) <= 48
                lines += ("✅ " + a.description + if (left.isNotBlank()) " · $left" else "") to urgent
            }
            s.cases.filter { it.isOpen }.forEach { c ->
                val w = if (c.windowEnd.isNotBlank()) " · by " + Time.pretty(c.windowEnd, s.zone) else ""
                lines += ("⏳ " + c.name + " · " + c.stage.replace('_', ' ') + w) to false
            }
            if (lines.isEmpty()) {
                lines += (if (prefs.configured) "Nothing pending. You're all caught up 🎉" else "Open the app to finish setup") to false
            }

            val ids = listOf(R.id.widget_line1, R.id.widget_line2, R.id.widget_line3, R.id.widget_line4)
            ids.forEachIndexed { i, id ->
                val line = lines.getOrNull(i)
                if (line == null) {
                    v.setViewVisibility(id, View.GONE)
                } else {
                    v.setViewVisibility(id, View.VISIBLE)
                    v.setTextViewText(id, line.first)
                    v.setTextColor(id, ContextCompat.getColor(ctx, if (line.second) R.color.urgent else R.color.widget_text))
                }
            }
            val crit = s.openAlerts.count { it.isCritical }
            v.setViewVisibility(R.id.widget_badge, if (crit > 0) View.VISIBLE else View.GONE)
            v.setTextViewText(R.id.widget_badge, crit.toString())
            val more = (lines.size - ids.size).coerceAtLeast(0)
            v.setTextViewText(
                R.id.widget_footer,
                (if (more > 0) "+$more more · " else "") + "Updated " + Time.ago(prefs.lastSync) +
                    (if (prefs.lastError.isNotBlank()) " · ⚠️ offline" else ""),
            )

            v.setOnClickPendingIntent(
                R.id.widget_root,
                PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE),
            )
            v.setOnClickPendingIntent(
                R.id.widget_refresh,
                PendingIntent.getBroadcast(
                    ctx, 1, Intent(ctx, TrackerWidget::class.java).setAction(REFRESH), PendingIntent.FLAG_IMMUTABLE,
                ),
            )
            return v
        }
    }

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        mgr.updateAppWidget(ids, build(ctx))
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        super.onReceive(ctx, intent)
        if (intent.action == REFRESH) Sync.now(ctx)
    }
}
