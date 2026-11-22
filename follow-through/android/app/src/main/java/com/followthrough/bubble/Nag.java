package com.followthrough.bubble;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.Executors;

/**
 * The persistent part: keeps the widget fresh, tracks your streak, and nags you
 * (politely, then less politely) until you act on what's due.
 *
 * Rules (quiet from 22:00 to 08:00):
 *  - Something urgent (overdue, due ≤ 3 days, event ≤ 2 days, reminder due): nag every 3 hours,
 *    every 2 hours when something closes today. The tone escalates with each nag that day.
 *  - Morning summary once a day after 08:00.
 *  - Streak at risk: after 19:00 if you haven't done anything today.
 *  - Nothing saved for 3+ days: once a day.
 */
final class Nag {
    static final String CHANNEL = "nags";
    private static final int JOB_ID = 4242;
    private static final Random RNG = new Random();

    private Nag() {}

    /* ---------- items ---------- */

    static final class Item {
        String id, title, kind; int days; int score;
        Item(String id, String title, String kind, int days, int score) { this.id = id; this.title = title; this.kind = kind; this.days = days; this.score = score; }
    }

    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    private static int daysUntil(String iso) {
        if (iso == null || iso.length() < 10) return Integer.MIN_VALUE;
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            long a = f.parse(today()).getTime(), b = f.parse(iso.substring(0, 10)).getTime();
            return (int) Math.round((b - a) / 86400000.0);
        } catch (Exception e) { return Integer.MIN_VALUE; }
    }

    static List<Item> urgent(JSONObject dash) {
        List<Item> out = new ArrayList<>();
        JSONArray rows = dash.optJSONArray("rows");
        for (int i = 0; rows != null && i < rows.length(); i++) {
            JSONObject r = rows.optJSONObject(i);
            if (r == null) continue;
            String st = r.optString("Status"), title = r.optString("Title", "Something you saved");
            if (title.isEmpty()) title = "Something you saved";
            boolean active = st.equals("Saved") || st.equals("Preparing");
            int d = daysUntil(r.optString("Deadline")), rem = daysUntil(r.optString("Remind on"));
            boolean event = "Event".equals(r.optString("Category"));
            String id = r.optString("ID");
            if (st.equals("New")) { out.add(new Item(id, "a new capture", "new", 0, 30)); continue; }
            if (active) {
                if (d != Integer.MIN_VALUE && d < 0 && d > -15) out.add(new Item(id, title, "overdue", d, 0));
                else if (event && d != Integer.MIN_VALUE && d <= 2 && d >= 0) out.add(new Item(id, title, "event", d, 1 + d));
                else if (d != Integer.MIN_VALUE && d <= 3 && d >= 0) out.add(new Item(id, title, "due", d, 1 + d));
                else if (d != Integer.MIN_VALUE && d <= 7 && d >= 0) out.add(new Item(id, title, "soon", d, 5 + d));
                else if (rem != Integer.MIN_VALUE && rem <= 0) out.add(new Item(id, title, "reminder", d, 20));
            } else if (st.equals("Submitted") && rem != Integer.MIN_VALUE && rem <= 0) {
                out.add(new Item(id, title, "check", 0, 40));
            }
        }
        out.sort((a, b) -> a.score - b.score);
        return out;
    }

    private static int daysSinceLastSave(JSONObject dash) {
        String last = "";
        JSONArray rows = dash.optJSONArray("rows"), tips = dash.optJSONArray("tips");
        for (int i = 0; rows != null && i < rows.length(); i++) { String c = rows.optJSONObject(i).optString("Captured"); if (c.compareTo(last) > 0) last = c; }
        for (int i = 0; tips != null && i < tips.length(); i++) { String c = tips.optJSONObject(i).optString("Saved"); if (c.compareTo(last) > 0) last = c; }
        if (last.isEmpty()) return 99;
        return -daysUntil(last);
    }

    /* ---------- copy ---------- */

    private static String pick(String... options) { return options[RNG.nextInt(options.length)]; }
    private static String when(int d) { return d == 0 ? "today" : d == 1 ? "tomorrow" : "in " + d + " days"; }

    /** The nag line for an item; level = how many times you've been nagged today. */
    static String line(Item it, int level) {
        String t = it.title;
        switch (it.kind) {
            case "overdue": return pick("The deadline for " + t + " has passed. Did you apply? Tap Submitted, or let it go.",
                    t + " closed " + (-it.days) + (it.days == -1 ? " day" : " days") + " ago. Tell me what happened so I can stop asking. 🙃");
            case "event": return "📅 " + t + " is " + when(it.days) + ". Registered yet?";
            case "due":
                if (it.days == 0) return pick("🚨 " + t + " closes TODAY. This is your sign.", "🚨 Today's the day for " + t + ". Not tomorrow. Today.");
                if (level == 0) return "⏳ " + t + ": " + when(it.days) + ". Five minutes now beats a panic later.";
                if (level == 1) return "Still me. " + t + " closes " + when(it.days) + ". 👀";
                if (level == 2) return "I'll keep reminding you until " + t + " is done. That's a promise. 😤";
                return pick("Okay this is getting awkward. " + t + ". " + when(it.days) + ". You've got this.",
                        "Me again. " + t + ". Open it. Just open it. 🙏");
            case "soon": return pick(t + " closes " + when(it.days) + ". Start the essay while it's calm.",
                    "One week warning ⏳ " + t + ". Future you says thanks.");
            case "reminder": return pick("You asked me to remind you about " + t + ". Here I am. 🙃",
                    "Remember " + t + "? It remembers you.");
            case "check": return pick("It's been two weeks since you applied to " + t + ". Any news?",
                    "Heard back from " + t + "? Tap to record the result.");
            case "new": return "You saved something that hasn't been sorted yet. Open the app and I'll sort it.";
        }
        return t;
    }

    /* ---------- streak ---------- */

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("nag", Context.MODE_PRIVATE); }

    static void markActive(Context c) {
        SharedPreferences p = prefs(c);
        String today = today(), last = p.getString("activeDay", "");
        if (today.equals(last)) return;
        int streak = daysUntil(last) == -1 ? p.getInt("streak", 0) + 1 : 1;
        p.edit().putString("activeDay", today).putInt("streak", streak).apply();
        updateWidget(c);
    }

    static int streak(Context c) {
        SharedPreferences p = prefs(c);
        int d = daysUntil(p.getString("activeDay", ""));
        return (d == 0 || d == -1) ? p.getInt("streak", 0) : 0;
    }

    static boolean activeToday(Context c) { return today().equals(prefs(c).getString("activeDay", "")); }

    /* ---------- data ---------- */

    static void saveDashboard(Context c, String json) {
        prefs(c).edit().putString("dash", json).putLong("dashAt", System.currentTimeMillis()).apply();
        updateWidget(c);
    }

    static JSONObject cached(Context c) {
        try { return new JSONObject(prefs(c).getString("dash", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    static void refreshAsync(Context c) {
        final Context ctx = c.getApplicationContext();
        Executors.newSingleThreadExecutor().execute(() -> refresh(ctx, false));
    }

    /** Fetch the latest from the sheet, update the widget and (optionally) nag. Blocking. */
    static void refresh(Context c, boolean mayNotify) {
        String res = Tracker.callBlocking(c, "{\"action\":\"dashboard\"}", 60000);
        try {
            JSONObject j = new JSONObject(res);
            if (j.optBoolean("ok")) saveDashboard(c, res);
        } catch (Exception ignored) {}
        updateWidget(c);
        if (mayNotify) maybeNag(c);
    }

    /* ---------- schedule ---------- */

    static void schedule(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(JOB_ID) != null) return;
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(c, NagJob.class))
                .setPeriodic(60 * 60 * 1000L, 15 * 60 * 1000L)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build());
    }

    /* ---------- notifications ---------- */

    private static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Nudges & deadlines", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Reminders that keep at you until you act on your applications.");
            nm.createNotificationChannel(ch);
        }
    }

    static void maybeNag(Context c) {
        Calendar now = Calendar.getInstance();
        int hour = now.get(Calendar.HOUR_OF_DAY);
        if (hour < 8 || hour >= 22) return;
        SharedPreferences p = prefs(c);
        String today = today();
        if (!today.equals(p.getString("nagDay", ""))) p.edit().putString("nagDay", today).putInt("nagsToday", 0)
                .putBoolean("morningSent", false).putBoolean("streakSent", false).putBoolean("idleSent", false).apply();
        long since = System.currentTimeMillis() - p.getLong("lastNag", 0);
        int level = p.getInt("nagsToday", 0);
        JSONObject dash = cached(c);
        List<Item> items = urgent(dash);

        // Morning summary
        if (!p.getBoolean("morningSent", false) && !items.isEmpty()) {
            Item top = items.get(0);
            notify(c, 1, "Good morning ☀️ " + items.size() + (items.size() == 1 ? " thing needs" : " things need") + " you today",
                    "First up: " + line(top, 0), top);
            p.edit().putBoolean("morningSent", true).putLong("lastNag", System.currentTimeMillis()).apply();
            return;
        }
        // Escalating nag about the most urgent thing
        if (!items.isEmpty()) {
            Item top = items.get(0);
            boolean today0 = (top.kind.equals("due") || top.kind.equals("event")) && top.days == 0;
            long gap = today0 ? 2 * 3600_000L : 3 * 3600_000L;
            boolean nagWorthy = !top.kind.equals("soon") || level == 0;
            if (since >= gap && nagWorthy) {
                notify(c, 2, items.size() > 1 ? "Follow-Through · " + items.size() + " things waiting" : "Follow-Through", line(top, level), top);
                p.edit().putInt("nagsToday", level + 1).putLong("lastNag", System.currentTimeMillis()).apply();
                return;
            }
        }
        // Streak at risk
        int streak = streak(c);
        if (hour >= 19 && streak > 0 && !activeToday(c) && !p.getBoolean("streakSent", false)) {
            notify(c, 3, "🔥 Your " + streak + "-day streak ends at midnight",
                    pick("One small step keeps it alive: save an opportunity, update a status, or tailor your CV.",
                         "Don't let it die like that hackathon idea. Tap to keep it going."), null);
            p.edit().putBoolean("streakSent", true).apply();
            return;
        }
        // Nothing saved for a while
        int idle = daysSinceLastSave(dash);
        if (idle >= 3 && idle < 99 && hour >= 12 && !p.getBoolean("idleSent", false)) {
            notify(c, 4, "It's quiet in here 👀",
                    pick("You haven't saved an opportunity in " + idle + " days. They don't find themselves.",
                         idle + " days without a new find. Scroll with purpose today: tap the bubble on one thing."), null);
            p.edit().putBoolean("idleSent", true).apply();
        }
    }

    private static void notify(Context c, int nid, String title, String text, Item item) {
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Notification.Builder b = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setColor(c.getColor(R.color.accent))
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(c, nid, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        if (item != null && !item.id.isEmpty() && !item.kind.equals("new")) {
            if (item.kind.equals("check")) {
                b.addAction(action(c, nid, ActionReceiver.HEARD_NOTHING, item.id, "No news yet"));
            } else {
                b.addAction(action(c, nid, ActionReceiver.SNOOZE, item.id, "Tomorrow"));
                if (!item.kind.equals("event")) b.addAction(action(c, nid, ActionReceiver.SUBMITTED, item.id, "I applied ✓"));
            }
        }
        try { c.getSystemService(NotificationManager.class).notify(nid, b.build()); } catch (SecurityException ignored) {}
    }

    private static Notification.Action action(Context c, int nid, String act, String id, String label) {
        Intent i = new Intent(c, ActionReceiver.class).setAction(act).putExtra("id", id).putExtra("nid", nid);
        PendingIntent pi = PendingIntent.getBroadcast(c, (act + id).hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Action.Builder(null, label, pi).build();
    }

    /* ---------- widget ---------- */

    static void updateWidget(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, WidgetProvider.class));
        if (ids.length == 0) return;
        m.updateAppWidget(ids, widgetViews(c));
    }

    static RemoteViews widgetViews(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        JSONObject dash = cached(c);
        List<Item> items = urgent(dash);
        int streak = streak(c);
        v.setTextViewText(R.id.w_streak, streak > 0 ? "🔥 " + streak : "🔥 0");

        String headline; int bg;
        if (!dash.has("rows")) { headline = "Open Follow-Through once to wake me up."; bg = R.drawable.widget_bg_calm; }
        else if (items.isEmpty()) {
            headline = activeToday(c) ? "All clear. Proud of you. 😌" : pick("Nothing urgent. Go find something new to apply for. 👀", "Quiet day. Perfect time to polish your CV.");
            bg = R.drawable.widget_bg_calm;
        } else {
            Item top = items.get(0);
            headline = line(top, prefs(c).getInt("nagsToday", 0));
            boolean hot = top.kind.equals("overdue") || ((top.kind.equals("due") || top.kind.equals("event")) && top.days <= 1);
            bg = hot ? R.drawable.widget_bg_hot : (top.kind.equals("due") || top.kind.equals("event")) ? R.drawable.widget_bg_warn : R.drawable.widget_bg_calm;
        }
        v.setInt(R.id.w_root, "setBackgroundResource", bg);
        v.setTextViewText(R.id.w_headline, headline);

        int[] lineIds = {R.id.w_line1, R.id.w_line2, R.id.w_line3};
        int shown = 0;
        for (Item it : items) {
            if (shown == 3) break;
            if (it.kind.equals("new")) continue;
            String tag = it.kind.equals("overdue") ? "passed" : it.kind.equals("check") ? "any news?" : it.kind.equals("reminder") ? "reminder"
                    : it.days == 0 ? "TODAY" : it.days == 1 ? "tomorrow" : it.days + "d";
            v.setTextViewText(lineIds[shown], "• " + it.title + "  ·  " + tag);
            v.setViewVisibility(lineIds[shown], android.view.View.VISIBLE);
            shown++;
        }
        for (int i = shown; i < 3; i++) v.setViewVisibility(lineIds[i], android.view.View.GONE);
        long at = prefs(c).getLong("dashAt", 0);
        v.setTextViewText(R.id.w_footer, at == 0 ? "Tap to open" : "Tap to open · updated " + new SimpleDateFormat("HH:mm", Locale.US).format(new Date(at)));

        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 99, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }
}
