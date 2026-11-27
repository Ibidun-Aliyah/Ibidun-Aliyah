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
import android.net.Uri;
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
        String id, title, kind; int days; int score; int need;
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

    /* ---------- effort (mirrors the dashboard): days an application really needs ---------- */
    private static final java.util.regex.Pattern ELIG = java.util.regex.Pattern.compile("^(age|ages|team( size)?|teams of|open to|must be|eligib|no previous|check |see the|nationality|minimum|completed at least|aged|deadline)|\\bage(s|d)? \\d|years old|team of \\d");
    private static double[] reqDays(String t) {   // {work, lead}
        t = t.toLowerCase(Locale.ROOT);
        if (ELIG.matcher(t).find()) return new double[]{0, 0};
        if (t.matches(".*(recommend|reference|referee).*")) return new double[]{t.matches(".*\\b2\\b.*") ? 1 : 0.5, 14};
        if (t.matches(".*(transcript|certificate|official|passport|visa|birth|proof of|bank statement|attestation).*")) return new double[]{0.5, 5};
        java.util.regex.Matcher w = java.util.regex.Pattern.compile("(\\d{3,4})\\s*words?").matcher(t);
        if (t.matches(".*(essay|statement|motivation|cover letter|personal|why do you|why you|explain|question|short answer|words|abstract|summary|pitch).*"))
            return new double[]{w.find() ? Math.min(4, Math.max(1, Integer.parseInt(w.group(1)) / 300.0)) : t.matches(".*(abstract|summary).*") ? 1 : 2, 0};
        if (t.matches(".*(proposal|research plan|project plan|business plan).*")) return new double[]{3, 0};
        if (t.matches(".*(deploy|host|publish).*")) return new double[]{1, 0};
        if (t.matches(".*(build|develop|prototype|portfolio|project|code|app\\b|design|demo|model).*")) return new double[]{3, 0};
        if (t.matches(".*video.*")) return new double[]{2, 0};
        if (t.matches(".*(assessment|test|exam|quiz|interview).*")) return new double[]{1.5, 0};
        if (t.matches(".*(register|registration|sign ?up|rsvp).*")) return new double[]{0.2, 0};
        return new double[]{0.5, 0};
    }
    static int needDays(JSONObject r) {
        if ("Event".equals(r.optString("Category"))) return 1;
        String[] lines = r.optString("Requirements").split("\n");
        double work = 0, lead = 0; int n = 0, open = 0; boolean known = false;
        for (String l : lines) {
            l = l.trim(); if (l.isEmpty()) continue; n++;
            boolean done = l.startsWith("✓");
            double[] d = reqDays(l.replaceFirst("^✓\\s*", ""));
            if (d[0] > 0 || d[1] > 0) known = true;
            if (done) continue;
            open++; work += d[0]; lead = Math.max(lead, d[1]);
        }
        if (n > 0 && open == 0) return 0;
        String type = r.optString("Type", "other").toLowerCase(Locale.ROOT);
        double base = type.matches("scholarship|programme|program|research") ? 4 : type.matches("fellowship|grant") ? 5 : type.matches("internship|job|competition|hackathon|challenge") ? 2 : 1;
        if (!known) work = base;
        return (int) Math.ceil(Math.max(lead, work * 2)) + 1;
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
                else if (!event && d != Integer.MIN_VALUE && d > 3 && d - needDays(r) <= 0) { Item it = new Item(id, title, "start", d, 2); it.need = needDays(r); out.add(it); }
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

    /** The nag line for an item, in Bisi's voice; level = how many times you've been nagged today. */
    static String line(Item it, int level) {
        String t = it.title;
        switch (it.kind) {
            case "overdue": return pick("The deadline for " + t + " passed. Did you apply, or should I start grieving?",
                    t + " closed. Tell me what happened so I can stop asking. (I won't stop asking.)");
            case "event": return pick("📅 " + t + " is " + when(it.days) + ". Registered yet? Asking very calmly.",
                    t + " is " + when(it.days) + ". I already picked my outfit. Did you register?");
            case "due":
                if (it.days == 0) return pick(t + " closes TODAY. I'm not mad. I'm just… hovering. 🐝",
                        "This is a hive-priority situation. " + t + " closes TODAY.",
                        "Today. " + t + ". Today. Bee-lieve me, tomorrow is too late.",
                        "It's deadline day for " + t + ". I cleared my whole schedule to watch you do this.");
                if (level == 0) return pick(t + " closes " + when(it.days) + ". Just thought you'd want to know.",
                        "Bee honest: have you even opened " + t + "?");
                if (level == 1) return pick("Me again. " + t + ". " + when(it.days) + ". 👀", "Don't let " + t + " buzz off. " + when(it.days).substring(0, 1).toUpperCase() + when(it.days).substring(1) + ".", t + " closes " + when(it.days) + ". Just thought you'd want to know. Again.");
                if (level == 2) return pick("Okay. I'll just keep reminding you about " + t + ". I have nothing but time. 🐝",
                        "Fun fact: " + t + " doesn't apply for itself. I checked.");
                return pick("I'm not saying I'm disappointed about " + t + ". I'm just saying I'm a bee and I'm sad.",
                        "Still " + t + ". Still " + when(it.days) + ". Still me. 🐝");
            case "start": return pick(t + " needs ~" + it.need + " days of work and closes in " + it.days + ". Start today. Not tomorrow. Today. 🐝",
                    "Big one: " + t + " takes about " + it.need + " days and you have " + it.days + ". The maths isn't mathing. Start now.",
                    t + " isn't due yet, but it needs ~" + it.need + " days. References and paperwork don't wait for you.");
            case "soon": return pick(t + " closes " + when(it.days) + ". Starting now would be very mature of you.", "Early bee gets the nectar. " + t + " closes " + when(it.days) + ".",
                    "One week until " + t + ". Future you is begging. I can hear her.");
            case "reminder": return pick("You asked me to remind you about " + t + ". So. Here I am. Reminding.",
                    "Remember " + t + "? It remembers you.");
            case "check": return pick("Two weeks since you applied to " + t + ". Any news, or are we pretending it didn't happen?",
                    "Heard back from " + t + "? I'm asking for a friend. The friend is me.");
            case "new": return "You saved something I haven't sorted yet. Open the app and I'll deal with it. Like always. 🐝";
        }
        return t;
    }

    /** Which Bisi face fits an item. */
    static int face(Item it) {
        if (it == null) return R.drawable.bisi_happy;
        switch (it.kind) {
            case "overdue": return R.drawable.bisi_sassy;
            case "due": return it.days <= 1 ? R.drawable.bisi_worried : R.drawable.bisi_sassy;
            case "event": case "check": case "soon": case "start": return R.drawable.bisi_worried;
            case "reminder": return R.drawable.bisi_sassy;
            default: return R.drawable.bisi_happy;
        }
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

    /** If you just broke a streak of 2+ days, how long it was (for Bisi's dramatic crying). */
    static int lostStreak(Context c) {
        SharedPreferences p = prefs(c);
        int d = daysUntil(p.getString("activeDay", ""));
        int s = p.getInt("streak", 0);
        return (d != Integer.MIN_VALUE && d < -1 && d >= -3 && s >= 2) ? s : 0;
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

    /* ---------- events: morning-of reminder (Join / Directions) and "Did you go?" that evening ---------- */
    static void eventNudges(Context c) {
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean morning = hour >= 7 && hour < 11, evening = hour >= 19 && hour < 22;
        if (!morning && !evening) return;
        JSONArray rows = cached(c).optJSONArray("rows");
        SharedPreferences p = prefs(c);
        String today = today();
        for (int i = 0; rows != null && i < rows.length(); i++) {
            JSONObject r = rows.optJSONObject(i);
            if (r == null || !"Event".equals(r.optString("Category")) || "Closed".equals(r.optString("Status")) || "Suggested".equals(r.optString("Status"))) continue;
            if (!r.optString("Deadline").startsWith(today)) continue;
            String id = r.optString("ID"), title = r.optString("Title", "your event"), key = (morning ? "evAM:" : "evPM:") + id + ":" + today;
            if (p.getBoolean(key, false)) continue;
            p.edit().putBoolean(key, true).apply();
            String notes = r.optString("Notes"), all = (notes + " " + title + " " + r.optString("Link")).toLowerCase(Locale.ROOT);
            boolean online = all.matches("(?s).*\\b(online|virtual|zoom|google meet|meet\\.google|teams|webinar|livestream)\\b.*");
            ensureChannel(c);
            int nid = 8100 + Math.abs(id.hashCode() % 800) + (morning ? 0 : 900);
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            Notification.Builder b = new Notification.Builder(c, CHANNEL).setSmallIcon(R.drawable.ic_notify).setColor(c.getColor(R.color.accent)).setAutoCancel(true)
                    .setContentIntent(PendingIntent.getActivity(c, nid, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            if (morning) {
                String text = pick("Today's the day: " + title + ". You've got this. Talk to at least two people. 🐝",
                        title + " is today! Charge your phone, bring your CV, and smile at strangers (professionally).",
                        "It's " + title + " day. I believe in you. Also, leave early. Lagos traffic doesn't.");
                b.setLargeIcon(android.graphics.drawable.Icon.createWithResource(c, R.drawable.bisi_party)).setContentTitle("📅 Today: " + title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text));
                String link = r.optString("Link");
                Uri go = online && link.startsWith("http") ? Uri.parse(link)
                        : Uri.parse("https://www.google.com/maps/search/?api=1&query=" + Uri.encode(title + " Lagos"));
                Intent view = new Intent(Intent.ACTION_VIEW, go).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                b.addAction(new Notification.Action.Builder(null, online ? "Join" : "Directions", PendingIntent.getActivity(c, nid + 1, view, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)).build());
            } else {
                String text = "Did you go? Tap to tell me, rate it, and save who you met. 🐝";
                b.setLargeIcon(android.graphics.drawable.Icon.createWithResource(c, R.drawable.bisi_happy)).setContentTitle("How was " + title + "?").setContentText(text);
            }
            try { c.getSystemService(NotificationManager.class).notify(nid, b.build()); } catch (SecurityException ignored) {}
        }
    }

    static void maybeNag(Context c) {
        try { eventNudges(c); } catch (Exception ignored) {}
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
            notify(c, 1, "Bisi · Good morning ☀️ " + items.size() + (items.size() == 1 ? " thing needs" : " things need") + " you today",
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
            notify(c, 3, "🌼 Your nectar run ends at midnight",
                    pick(streak + (streak == 1 ? " day" : " days") + " of nectar collected. It'd be a shame to spill it. One small step keeps the honey flowing. 🐝",
                         "No pressure. (Pressure.) Do one thing today or " + streak + " days of nectar go sticky-side down. 🍯",
                         "The flowers close at midnight. Save something, update a status, tailor your CV. Anything. 🌼"), null, R.drawable.bisi_worried);
            p.edit().putBoolean("streakSent", true).apply();
            return;
        }
        // Nothing saved for a while
        int idle = daysSinceLastSave(dash);
        if (idle >= 3 && idle < 99 && hour >= 12 && !p.getBoolean("idleSent", false)) {
            notify(c, 4, "It's quiet in here 👀",
                    pick("You haven't saved anything in " + idle + " days. I'm fine. Everything's fine.",
                         idle + " days without a single opportunity. The bubble misses you. I miss you."), null, R.drawable.bisi_sleepy);
            p.edit().putBoolean("idleSent", true).apply();
        }
    }

    private static void notify(Context c, int nid, String title, String text, Item item) {
        notify(c, nid, title, text, item, face(item));
    }

    private static void notify(Context c, int nid, String title, String text, Item item, int faceRes) {
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Notification.Builder b = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setColor(c.getColor(R.color.accent))
                .setLargeIcon(android.graphics.drawable.Icon.createWithResource(c, faceRes))
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
        Widgets.updateAll(c);
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
        v.setTextViewText(R.id.w_streak, "🍯 " + streak);

        String headline; int bg; int faceRes;
        int lost = lostStreak(c);
        if (!dash.has("rows")) { headline = "Hi, I'm Bisi. Open Follow-Through once to wake me up. 🐝"; bg = R.drawable.widget_bg_calm; faceRes = R.drawable.bisi_sleepy; }
        else if (lost >= 2 && !activeToday(c)) {
            headline = "You dropped " + lost + " days of nectar. It's everywhere. I'm fine. 😭"; bg = R.drawable.widget_bg_warn; faceRes = R.drawable.bisi_crying;
        } else if (items.isEmpty()) {
            headline = activeToday(c) ? pick("All clear. Look at you being responsible. 🥹", "Nothing urgent. I'm genuinely proud. Don't make it weird.")
                    : pick("Nothing urgent. Go find something new to apply for. 👀", "Quiet day. Perfect time to polish your CV. Just saying.");
            bg = R.drawable.widget_bg_calm; faceRes = activeToday(c) ? R.drawable.bisi_happy : R.drawable.bisi_sleepy;
        } else {
            Item top = items.get(0);
            faceRes = face(top);
            headline = line(top, prefs(c).getInt("nagsToday", 0));
            boolean hot = top.kind.equals("overdue") || ((top.kind.equals("due") || top.kind.equals("event")) && top.days <= 1);
            bg = hot ? R.drawable.widget_bg_hot : (top.kind.equals("due") || top.kind.equals("event")) ? R.drawable.widget_bg_warn : R.drawable.widget_bg_calm;
        }
        boolean hive = !"garden".equals(prefs(c).getString("skin", "hive"));
        if (hive) {
            bg = bg == R.drawable.widget_bg_hot ? R.drawable.widget_bg_hive_hot
                    : bg == R.drawable.widget_bg_warn ? R.drawable.widget_bg_hive_warn : R.drawable.widget_bg_hive_calm;
        }
        v.setViewVisibility(R.id.w_comb, hive ? android.view.View.VISIBLE : android.view.View.GONE);
        v.setInt(R.id.w_root, "setBackgroundResource", bg);
        v.setImageViewResource(R.id.w_bisi, faceRes);
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
