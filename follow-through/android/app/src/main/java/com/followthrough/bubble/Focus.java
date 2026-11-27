package com.followthrough.bubble;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Scroll guard: counts how long you've been in distracting apps (TikTok, Instagram, …) and,
 * after your limit, Bisi nudges you every few minutes with what you should be doing instead.
 * Only the open app's package name is used — never anything on the screen.
 */
final class Focus {
    static final String[][] KNOWN = {
            {"com.zhiliaoapp.musically", "TikTok"}, {"com.ss.android.ugc.trill", "TikTok"},
            {"com.instagram.android", "Instagram"}, {"com.instagram.barcelona", "Threads"},
            {"com.twitter.android", "X (Twitter)"}, {"com.facebook.katana", "Facebook"}, {"com.facebook.lite", "Facebook Lite"},
            {"com.snapchat.android", "Snapchat"}, {"com.google.android.youtube", "YouTube"},
            {"com.reddit.frontpage", "Reddit"}, {"com.pinterest", "Pinterest"}, {"com.netflix.mediaclient", "Netflix"},
            {"com.whatsapp", "WhatsApp"}, {"org.telegram.messenger", "Telegram"},
    };
    /** On by default; WhatsApp and Telegram are off because school chats live there. */
    private static final Set<String> DEFAULT_OFF = new HashSet<>(java.util.Arrays.asList("com.whatsapp", "org.telegram.messenger"));
    private static final String CHANNEL = "focus";
    private static final int NID = 7700;
    private static final Random RNG = new Random();

    static final String ACT_SNOOZE = "com.followthrough.FOCUS_SNOOZE";
    static final String ACT_TODAY = "com.followthrough.FOCUS_TODAY";

    private final Context ctx;
    private final Handler main = new Handler(Looper.getMainLooper());
    private String current = "";
    private boolean ticking;

    Focus(Context ctx) { this.ctx = ctx.getApplicationContext(); }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("focus", Context.MODE_PRIVATE); }
    static boolean on(Context c) { return prefs(c).getBoolean("on", true); }
    static int limit(Context c) { return prefs(c).getInt("limit", 60); }
    static int every(Context c) { return prefs(c).getInt("every", 15); }

    static Set<String> watched(Context c) {
        Set<String> s = prefs(c).getStringSet("apps", null);
        if (s != null) return new HashSet<>(s);
        Set<String> d = new HashSet<>();
        for (String[] k : KNOWN) if (!DEFAULT_OFF.contains(k[0])) d.add(k[0]);
        return d;
    }

    static String label(Context c, String pkg) {
        for (String[] k : KNOWN) if (k[0].equals(pkg)) return k[1];
        try { PackageManager pm = c.getPackageManager(); return pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString(); }
        catch (Exception e) { return "that app"; }
    }

    /* ---------- tracking (called from the bubble's accessibility service) ---------- */

    void onApp(String pkg) {
        if (pkg == null || pkg.isEmpty() || pkg.equals("com.android.systemui") || pkg.contains("inputmethod") || pkg.contains("keyboard")) return;
        current = pkg;
        if (pkg.equals(ctx.getPackageName())) reset(ctx);
        if (on(ctx) && watched(ctx).contains(pkg) && !ticking) { ticking = true; main.postDelayed(this::tick, 60_000); }
    }

    /** Once a minute while a session is running. */
    private void tick() {
        SharedPreferences p = prefs(ctx);
        boolean screenOn = ctx.getSystemService(PowerManager.class).isInteractive();
        boolean distracted = screenOn && on(ctx) && watched(ctx).contains(current);
        int mins = p.getInt("mins", 0), idle = p.getInt("idle", 0);
        SharedPreferences.Editor e = p.edit();
        String today = Nag.today();
        if (!today.equals(p.getString("day", ""))) e.putString("day", today).putInt("todayMins", 0).putLong("muteUntil", 0);
        if (distracted) {
            mins++; idle = 0;
            e.putInt("mins", mins).putInt("idle", 0).putString("lastApp", current)
                    .putInt("todayMins", (today.equals(p.getString("day", "")) ? p.getInt("todayMins", 0) : 0) + 1);
        } else {
            idle++;
            e.putInt("idle", idle);
            if (idle >= 5) { e.putInt("mins", 0).putInt("nudges", 0); mins = 0; }   // a real break resets the session
        }
        e.apply();
        int limit = limit(ctx), every = Math.max(5, every(ctx));
        if (distracted && mins >= limit && (mins - limit) % every == 0 && System.currentTimeMillis() > p.getLong("muteUntil", 0)) nudge(mins);
        if (mins > 0 || distracted) main.postDelayed(this::tick, 60_000); else ticking = false;
    }

    static void reset(Context c) {
        prefs(c).edit().putInt("mins", 0).putInt("idle", 0).putInt("nudges", 0).apply();
        c.getSystemService(NotificationManager.class).cancel(NID);
    }

    /* ---------- the nudge ---------- */

    private static String pick(String... o) { return o[RNG.nextInt(o.length)]; }

    static String dur(int m) { return m < 60 ? m + " min" : (m / 60) + "h" + (m % 60 == 0 ? "" : " " + String.format(java.util.Locale.US, "%02d", m % 60) + "m"); }

    /** The task to throw at you: the most urgent tracker item, else an overdue reminder note. */
    private static String[] task(Context c) {
        JSONObject dash = Nag.cached(c);
        List<Nag.Item> urgent = Nag.urgent(dash);
        for (Nag.Item it : urgent) {
            if (it.kind.equals("new") || it.kind.equals("check") || it.kind.equals("overdue")) continue;
            String step = "";
            JSONArray rows = dash.optJSONArray("rows");
            for (int i = 0; rows != null && i < rows.length(); i++) {
                JSONObject r = rows.optJSONObject(i);
                if (r == null || !it.id.equals(r.optString("ID"))) continue;
                for (String line : r.optString("Requirements").split("\n")) {
                    line = line.trim().replaceFirst("^[-•]\\s*", "");
                    if (!line.isEmpty() && !line.startsWith("✓")) { step = line; break; }
                }
            }
            String when = it.days == Integer.MIN_VALUE || it.kind.equals("reminder") ? "" :
                    it.days < 0 ? "closed already" : it.days == 0 ? "closes TODAY" : it.days == 1 ? "closes tomorrow" : "closes in " + it.days + " days";
            return new String[]{it.title, when, step};
        }
        JSONArray notes = Notes.all(c);
        long now = System.currentTimeMillis();
        for (int i = 0; i < notes.length(); i++) {
            JSONObject n = notes.optJSONObject(i);
            if (n != null && !n.optBoolean("done") && n.optLong("remindAt") > 0 && n.optLong("remindAt") < now + 6 * 3600_000L)
                return new String[]{n.optString("text").split("\n")[0], "is on your list for today", ""};
        }
        return null;
    }

    private void nudge(int mins) {
        SharedPreferences p = prefs(ctx);
        int level = p.getInt("nudges", 0);
        p.edit().putInt("nudges", level + 1).apply();
        String app = label(ctx, current), d = dur(mins);
        String[] t = task(ctx);
        String title, text;
        if (level >= 2) {
            title = pick("Still on " + app + ". " + d + ". 🐝", "Bisi is not going away", "Okay, this is nudge number " + (level + 1));
            text = t != null
                    ? pick("I'll keep buzzing every " + every(ctx) + " minutes until you put " + app + " down. " + t[0] + (t[1].isEmpty() ? "" : " " + t[1]) + ". I have nothing but time.",
                           "You know what doesn't scroll? " + t[0] + ". It just sits there. Waiting. Like me. 🐝",
                           d + " of " + app + ". " + t[0] + (t[1].isEmpty() ? "" : " " + t[1]) + ". I'm not crying, you're crying.")
                    : pick("I'll keep buzzing every " + every(ctx) + " minutes. I'm a bee. Buzzing is my whole personality.",
                           d + " on " + app + ". Your eyes deserve a break. So does your thumb. So do I.");
        } else if (t != null) {
            String step = t[2].isEmpty() ? "" : " Next step: " + t[2] + ".";
            title = pick("Aren't you forgetting something? 🐝", d + " on " + app + " 👀", "Bisi has been counting…", "Psst. " + t[0] + ".");
            text = pick("You've been on " + app + " for " + d + ". Meanwhile " + t[0] + (t[1].isEmpty() ? " is waiting" : " " + t[1]) + "." + step + " You could knock out a chunk in ~15 minutes if you locked in.",
                    d + " of " + app + ". " + t[0] + (t[1].isEmpty() ? "" : " " + t[1]) + "." + step + " 15 focused minutes, then scroll guilt-free. Deal?",
                    "Fun fact: in the " + d + " you've spent on " + app + ", you could have finished" + (t[2].isEmpty() ? " a good part of " + t[0] : " “" + t[2] + "” for " + t[0]) + ". Just saying. 🐝",
                    "Bee honest. Is " + app + " going to get you into " + t[0] + "? " + (t[1].isEmpty() ? "" : "It " + t[1] + ". ") + "Put it down for 15 minutes.");
        } else {
            title = pick("Aren't you forgetting something? 🐝", d + " on " + app + " 👀");
            text = pick("You've been on " + app + " for " + d + ". Nothing's due right now, so how about saving an opportunity instead of scrolling past it?",
                    d + " on " + app + ". Bisi isn't judging. Bisi is a bee. Bisi is judging a little.",
                    "That's " + d + " of " + app + ". Drink water, stretch, check your notes. Then come back if you must.");
        }
        show(title, text, level);
    }

    private void show(String title, String text, int level) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Scroll guard", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Bisi's nudges when you've been scrolling too long");
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(ctx, MainActivity.class).putExtra("lockIn", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(ctx, NID, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify).setColor(ctx.getColor(R.color.accent))
                .setLargeIcon(android.graphics.drawable.Icon.createWithResource(ctx, level >= 2 ? R.drawable.bisi_crying : level == 1 ? R.drawable.bisi_worried : R.drawable.bisi_sassy))
                .setContentTitle(title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true).setContentIntent(openPi)
                .addAction(new Notification.Action.Builder(null, "🔒 Lock in", openPi).build())
                .addAction(act(ACT_SNOOZE, "10 more min"))
                .addAction(act(ACT_TODAY, "Not today"))
                .build();
        try { nm.notify(NID, n); } catch (SecurityException ignored) {}
    }

    private Notification.Action act(String action, String label) {
        PendingIntent pi = PendingIntent.getBroadcast(ctx, action.hashCode(), new Intent(ctx, Receiver.class).setAction(action), PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Action.Builder(null, label, pi).build();
    }

    /** "10 more min" and "Not today". */
    public static class Receiver extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) {
            c.getSystemService(NotificationManager.class).cancel(NID);
            long until;
            String msg;
            if (ACT_TODAY.equals(i.getAction())) {
                Calendar cal = Calendar.getInstance(); cal.add(Calendar.DAY_OF_YEAR, 1); cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0);
                until = cal.getTimeInMillis(); msg = "Fine. Scroll in peace today. I'll be back tomorrow. 🐝";
            } else { until = System.currentTimeMillis() + 10 * 60_000L; msg = "10 minutes. I'm counting. 🐝"; }
            prefs(c).edit().putLong("muteUntil", until).apply();
            android.widget.Toast.makeText(c, msg, android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    /* ---------- settings for the dashboard ---------- */

    static String settingsJson(Context c) {
        try {
            SharedPreferences p = prefs(c);
            Set<String> w = watched(c);
            JSONArray known = new JSONArray();
            Set<String> seen = new HashSet<>();
            PackageManager pm = c.getPackageManager();
            for (String[] k : KNOWN) {
                boolean installed; try { pm.getApplicationInfo(k[0], 0); installed = true; } catch (Exception e) { installed = false; }
                if (seen.contains(k[1]) && !installed) continue;
                seen.add(k[1]);
                known.put(new JSONObject().put("pkg", k[0]).put("name", k[1]).put("on", w.contains(k[0])).put("installed", installed));
            }
            int today = Nag.today().equals(p.getString("day", "")) ? p.getInt("todayMins", 0) : 0;
            return new JSONObject().put("on", on(c)).put("limit", limit(c)).put("every", every(c)).put("apps", known)
                    .put("todayMins", today).put("bubble", BubbleService.instance != null).toString();
        } catch (Exception e) { return "{}"; }
    }

    static void saveSettings(Context c, String json) {
        try {
            JSONObject j = new JSONObject(json);
            SharedPreferences.Editor e = prefs(c).edit();
            if (j.has("on")) e.putBoolean("on", j.getBoolean("on"));
            if (j.has("limit")) e.putInt("limit", j.getInt("limit"));
            if (j.has("every")) e.putInt("every", j.getInt("every"));
            if (j.has("apps")) {
                Set<String> s = watched(c);
                JSONObject a = j.getJSONObject("apps");
                for (java.util.Iterator<String> it = a.keys(); it.hasNext(); ) {
                    String pkg = it.next();
                    boolean on = a.getBoolean(pkg);
                    // TikTok has two package names; keep them together.
                    for (String[] k : KNOWN) if (k[1].equals(label(c, pkg))) { if (on) s.add(k[0]); else s.remove(k[0]); }
                    if (on) s.add(pkg); else s.remove(pkg);
                }
                e.putStringSet("apps", s);
            }
            e.apply();
        } catch (Exception ignored) {}
    }
}
