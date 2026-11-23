package com.apptracker

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

// ---------------------------------------------------------------------------
// Models (mirror the Sheet columns served by the Apps Script web app)
// ---------------------------------------------------------------------------

data class Case(
    val id: String, val status: String, val org: String, val program: String,
    val stage: String, val outcome: String, val windowStart: String, val windowEnd: String,
    val lastEmailAt: String, val lastSubject: String, val lastLink: String,
    val sourceUrl: String, val summary: String, val history: String, val updated: String,
) {
    val name: String
        get() = when {
            org.isNotBlank() && program.isNotBlank() && !program.contains(org, ignoreCase = true) -> "$org — $program"
            program.isNotBlank() -> program
            org.isNotBlank() -> org
            else -> "Application"
        }
    val isOpen get() = status == "open"
}

data class Action(
    val id: String, val caseId: String, val description: String, val deadline: String,
    val done: Boolean, val link: String,
)

data class Alert(
    val id: String, val caseId: String, val actionId: String, val level: String,
    val title: String, val body: String, val link: String, val created: String, val acked: Boolean,
) {
    val isCritical get() = level == "critical"
}

data class TrackerState(
    val cases: List<Case>, val actions: List<Action>, val alerts: List<Alert>, val timezone: String,
) {
    fun case(id: String) = cases.firstOrNull { it.id == id }
    val openAlerts get() = alerts.filter { !it.acked && it.level != "info" }
        .sortedWith(compareBy({ if (it.isCritical) 0 else 1 }, { it.created }))
    val openActions get() = actions.filter { !it.done }
        .sortedBy { Time.deadlineInstant(it.deadline, zone)?.toEpochMilli() ?: Long.MAX_VALUE }
    val zone: ZoneId get() = runCatching { ZoneId.of(timezone) }.getOrDefault(ZoneId.systemDefault())

    companion object {
        val EMPTY = TrackerState(emptyList(), emptyList(), emptyList(), ZoneId.systemDefault().id)

        fun parse(json: String): TrackerState {
            val o = JSONObject(json)
            if (!o.optBoolean("ok", false)) throw IOException(o.optString("error", "Server error"))
            return TrackerState(
                cases = o.optJSONArray("cases").objects().map {
                    Case(
                        it.s("id"), it.s("status"), it.s("org"), it.s("program"), it.s("stage"),
                        it.s("outcome"), it.s("window_start"), it.s("window_end"), it.s("last_email_at"),
                        it.s("last_subject"), it.s("last_link"), it.s("source_url"), it.s("summary"),
                        it.s("history"), it.s("updated"),
                    )
                },
                actions = o.optJSONArray("actions").objects().map {
                    Action(it.s("id"), it.s("case_id"), it.s("description"), it.s("deadline"), it.b("done"), it.s("link"))
                },
                alerts = o.optJSONArray("alerts").objects().map {
                    Alert(
                        it.s("id"), it.s("case_id"), it.s("action_id"), it.s("level"), it.s("title"),
                        it.s("body"), it.s("link"), it.s("created"), it.b("acked"),
                    )
                },
                timezone = o.optString("timezone", ZoneId.systemDefault().id),
            )
        }
    }
}

private fun JSONArray?.objects(): List<JSONObject> =
    if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }

private fun JSONObject.s(k: String): String = if (isNull(k)) "" else optString(k, "")
private fun JSONObject.b(k: String): Boolean = when (val v = opt(k)) {
    is Boolean -> v
    else -> v?.toString()?.equals("true", ignoreCase = true) == true
}

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

class Prefs(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("apptracker", Context.MODE_PRIVATE)

    var url: String
        get() = p.getString("url", "") ?: ""
        set(v) = p.edit().putString("url", v.trim()).apply()
    var token: String
        get() = p.getString("token", "") ?: ""
        set(v) = p.edit().putString("token", v.trim()).apply()
    var stateJson: String
        get() = p.getString("state", "") ?: ""
        set(v) = p.edit().putString("state", v).apply()
    var lastSync: Long
        get() = p.getLong("lastSync", 0)
        set(v) = p.edit().putLong("lastSync", v).apply()
    var lastError: String
        get() = p.getString("lastError", "") ?: ""
        set(v) = p.edit().putString("lastError", v).apply()

    /** Alerts we've already shown at least once (so "important" ones only buzz once). */
    var shownAlerts: Set<String>
        get() = p.getStringSet("shown", emptySet()) ?: emptySet()
        set(v) = p.edit().putStringSet("shown", v).apply()

    /** Alerts/actions marked handled on the phone but maybe not yet sent to the server. */
    var locallyHandled: Set<String>
        get() = p.getStringSet("handled", emptySet()) ?: emptySet()
        set(v) = p.edit().putStringSet("handled", v).apply()

    val configured get() = url.startsWith("https://") && token.isNotBlank()

    fun state(): TrackerState {
        val s = runCatching { TrackerState.parse(stateJson) }.getOrDefault(TrackerState.EMPTY)
        val handled = locallyHandled
        if (handled.isEmpty()) return s
        return s.copy(
            alerts = s.alerts.map { if (it.id in handled) it.copy(acked = true) else it },
            actions = s.actions.map { if (it.id in handled) it.copy(done = true) else it },
        )
    }
}

// ---------------------------------------------------------------------------
// Apps Script web app API
// ---------------------------------------------------------------------------

object Api {
    fun fetchState(prefs: Prefs): String {
        val url = prefs.url + (if (prefs.url.contains("?")) "&" else "?") +
            "token=" + URLEncoder.encode(prefs.token, "UTF-8")
        val body = request(url, null)
        TrackerState.parse(body) // validate before caching
        return body
    }

    fun post(prefs: Prefs, action: String, extra: Map<String, String> = emptyMap()): JSONObject {
        val payload = JSONObject().put("token", prefs.token).put("action", action)
        extra.forEach { (k, v) -> payload.put(k, v) }
        val res = JSONObject(request(prefs.url, payload.toString()))
        if (!res.optBoolean("ok", false)) throw IOException(res.optString("error", "Request failed"))
        return res
    }

    /** Apps Script answers with a redirect to googleusercontent.com, which must be fetched with GET. */
    private fun request(startUrl: String, postBody: String?): String {
        var url = startUrl
        var body = postBody
        repeat(5) {
            val c = URL(url).openConnection() as HttpURLConnection
            c.instanceFollowRedirects = false
            c.connectTimeout = 20_000
            c.readTimeout = 90_000
            if (body != null) {
                c.requestMethod = "POST"
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body!!.toByteArray()) }
            }
            val code = c.responseCode
            if (code in 300..399) {
                url = c.getHeaderField("Location") ?: throw IOException("Redirect without location")
                body = null
                c.disconnect()
                return@repeat
            }
            val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
            c.disconnect()
            if (code >= 400) throw IOException("HTTP $code")
            if (text.trimStart().startsWith("<")) {
                throw IOException("Got a web page instead of data. Check the URL ends in /exec and access is \"Anyone\".")
            }
            return text
        }
        throw IOException("Too many redirects")
    }
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

object Time {
    private val dayFmt = DateTimeFormatter.ofPattern("EEE d MMM", Locale.getDefault())
    private val dayTimeFmt = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm", Locale.getDefault())

    /** "2026-12-03" → end of that day; "2026-12-03T14:00" → that time; ISO instants also work. */
    fun deadlineInstant(s: String, zone: ZoneId): Instant? {
        if (s.isBlank()) return null
        return runCatching { Instant.parse(s) }.getOrNull()
            ?: runCatching { LocalDateTime.parse(s.take(16)).atZone(zone).toInstant() }.getOrNull()
            ?: runCatching { LocalDate.parse(s.take(10)).atTime(23, 59).atZone(zone).toInstant() }.getOrNull()
    }

    fun pretty(s: String, zone: ZoneId): String {
        val i = deadlineInstant(s, zone) ?: return s
        val hasTime = s.length > 10
        return ZonedDateTime.ofInstant(i, zone).format(if (hasTime) dayTimeFmt else dayFmt)
    }

    fun countdown(s: String, zone: ZoneId, now: Instant = Instant.now()): String {
        val i = deadlineInstant(s, zone) ?: return ""
        val d = Duration.between(now, i)
        if (d.isNegative) return "overdue"
        val h = d.toHours()
        return when {
            h < 1 -> "${d.toMinutes()} min left"
            h < 48 -> "${h}h left"
            else -> "${d.toDays()} days left"
        }
    }

    fun hoursLeft(s: String, zone: ZoneId): Long? =
        deadlineInstant(s, zone)?.let { Duration.between(Instant.now(), it).toHours() }

    fun ago(epochMs: Long): String {
        if (epochMs == 0L) return "never"
        val m = Duration.between(Instant.ofEpochMilli(epochMs), Instant.now()).toMinutes()
        return when {
            m < 1 -> "just now"
            m < 60 -> "$m min ago"
            m < 48 * 60 -> "${m / 60}h ago"
            else -> "${m / 1440} days ago"
        }
    }
}
