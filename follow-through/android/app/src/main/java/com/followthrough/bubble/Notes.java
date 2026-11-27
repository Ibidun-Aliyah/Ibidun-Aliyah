package com.followthrough.bubble;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notes and reminders, kept on the phone (they work offline and need no script).
 * A note: {id, text, items:[{t, done}], color, pinned, remindAt (ms, 0 = none), done, created, updated}.
 */
final class Notes {
    static final String CHANNEL = "reminders";
    private Notes() {}

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences("notes", Context.MODE_PRIVATE); }

    static synchronized JSONArray all(Context c) {
        try { return new JSONArray(prefs(c).getString("list", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    private static void store(Context c, JSONArray a) { prefs(c).edit().putString("list", a.toString()).apply(); }

    static synchronized JSONObject save(Context c, JSONObject n) {
        try {
            JSONArray a = all(c), out = new JSONArray();
            if (!n.has("id") || n.optString("id").isEmpty()) {
                n.put("id", "n" + Long.toString(System.currentTimeMillis(), 36) + new Random().nextInt(999));
                n.put("created", System.currentTimeMillis());
            }
            n.put("updated", System.currentTimeMillis());
            boolean found = false;
            for (int i = 0; i < a.length(); i++) {
                JSONObject x = a.getJSONObject(i);
                if (x.optString("id").equals(n.optString("id"))) { out.put(n); found = true; } else out.put(x);
            }
            if (!found) out.put(n);
            store(c, out);
            schedule(c, n);
            Widgets.updateNote(c);
        } catch (Exception ignored) {}
        return n;
    }

    static synchronized void delete(Context c, String id) {
        try {
            JSONArray a = all(c), out = new JSONArray();
            for (int i = 0; i < a.length(); i++) { JSONObject x = a.getJSONObject(i); if (!x.optString("id").equals(id)) out.put(x); else cancel(c, x); }
            store(c, out);
            Widgets.updateNote(c);
        } catch (Exception ignored) {}
    }

    static synchronized JSONObject get(Context c, String id) {
        JSONArray a = all(c);
        for (int i = 0; i < a.length(); i++) { JSONObject x = a.optJSONObject(i); if (x != null && x.optString("id").equals(id)) return x; }
        return null;
    }

    /* ---------- reminders ---------- */

    private static PendingIntent alarmIntent(Context c, String id) {
        Intent i = new Intent(c, NoteReminderReceiver.class).setAction(NoteReminderReceiver.FIRE).putExtra("id", id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void schedule(Context c, JSONObject n) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        String id = n.optString("id");
        long at = n.optLong("remindAt", 0);
        am.cancel(alarmIntent(c, id));
        if (at <= System.currentTimeMillis() || n.optBoolean("done")) return;
        try {
            if (android.os.Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(c, id));
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(c, id));
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(c, id));
        }
    }

    static void cancel(Context c, JSONObject n) {
        c.getSystemService(AlarmManager.class).cancel(alarmIntent(c, n.optString("id")));
    }

    static void rescheduleAll(Context c) {
        JSONArray a = all(c);
        for (int i = 0; i < a.length(); i++) { JSONObject x = a.optJSONObject(i); if (x != null) schedule(c, x); }
    }

    static String title(JSONObject n) {
        String t = n.optString("text", "").trim();
        int nl = t.indexOf('\n');
        if (nl > 0) t = t.substring(0, nl);
        if (t.isEmpty() && n.optJSONArray("items") != null && n.optJSONArray("items").length() > 0) t = n.optJSONArray("items").optJSONObject(0).optString("t");
        return t.length() > 80 ? t.substring(0, 80) + "…" : (t.isEmpty() ? "Your note" : t);
    }

    static void notifyReminder(Context c, JSONObject n) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Your reminders", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Reminders you set in notes, at the time you chose.");
            nm.createNotificationChannel(ch);
        }
        String id = n.optString("id");
        int nid = 7000 + Math.abs(id.hashCode() % 1000);
        String[] lines = {"You asked me to remind you. So: ", "Bisi here, as promised: ", "It's time. ", "Reminder, delivered with love (and judgement): "};
        String body = lines[new Random().nextInt(lines.length)] + title(n);
        Intent open = new Intent(c, MainActivity.class).putExtra("openNote", id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Notification.Builder b = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setLargeIcon(android.graphics.drawable.Icon.createWithResource(c, R.drawable.bisi_happy))
                .setColor(c.getColor(R.color.mark))
                .setContentTitle("🐝 " + title(n))
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body + (n.optString("text").contains("\n") ? "\n\n" + n.optString("text") : "")))
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setContentIntent(PendingIntent.getActivity(c, nid, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
                .addAction(action(c, NoteReminderReceiver.DONE, id, nid, "Done ✓"))
                .addAction(action(c, NoteReminderReceiver.SNOOZE10, id, nid, "10 min"))
                .addAction(action(c, NoteReminderReceiver.SNOOZE60, id, nid, "1 hour"));
        try { nm.notify(nid, b.build()); } catch (SecurityException ignored) {}
    }

    private static Notification.Action action(Context c, String act, String id, int nid, String label) {
        Intent i = new Intent(c, NoteReminderReceiver.class).setAction(act).putExtra("id", id).putExtra("nid", nid);
        PendingIntent pi = PendingIntent.getBroadcast(c, (act + id).hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Action.Builder(null, label, pi).build();
    }

    /* ---------- "remind me at 6pm tomorrow" ---------- */

    private static final String[] DAYS = {"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"};

    /** Finds a time in spoken text. Returns epoch ms, or 0 if there's none. */
    static long parseWhen(String text) {
        String s = " " + text.toLowerCase(Locale.ROOT).replace(".", "") + " ";
        Calendar now = Calendar.getInstance(), c = (Calendar) now.clone();
        c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        boolean found = false, hasTime = false;

        Matcher in = Pattern.compile("in (an?|\\d+) (minute|min|hour|hr|day)s?").matcher(s);
        if (in.find()) {
            int n = in.group(1).startsWith("a") ? 1 : Integer.parseInt(in.group(1));
            String u = in.group(2);
            c.add(u.startsWith("m") ? Calendar.MINUTE : u.startsWith("h") ? Calendar.HOUR_OF_DAY : Calendar.DAY_OF_YEAR, n);
            return c.getTimeInMillis();
        }
        if (s.contains(" tomorrow ")) { c.add(Calendar.DAY_OF_YEAR, 1); found = true; }
        else if (s.contains(" today ")) found = true;
        else {
            for (int d = 0; d < 7; d++) {
                if (s.contains(" " + DAYS[d] + " ")) {
                    int diff = (d + 1) - c.get(Calendar.DAY_OF_WEEK);
                    if (diff <= 0) diff += 7;
                    c.add(Calendar.DAY_OF_YEAR, diff); found = true; break;
                }
            }
        }
        Matcher t = Pattern.compile("(?:at |by )?(\\d{1,2})(?::(\\d{2}))? ?(am|pm|o'?clock)?").matcher(s);
        while (t.find()) {
            String ap = t.group(3);
            boolean explicit = ap != null || t.group(2) != null || t.group(0).startsWith("at") || t.group(0).startsWith("by");
            if (!explicit) continue;
            int h = Integer.parseInt(t.group(1)), m = t.group(2) != null ? Integer.parseInt(t.group(2)) : 0;
            if (h > 23 || m > 59) continue;
            if ("pm".equals(ap) && h < 12) h += 12;
            if ("am".equals(ap) && h == 12) h = 0;
            if (ap == null && h >= 1 && h <= 7) h += 12;       // "at 6" usually means 6 pm
            c.set(Calendar.HOUR_OF_DAY, h); c.set(Calendar.MINUTE, m);
            hasTime = true; found = true; break;
        }
        if (!hasTime) {
            if (s.contains(" tonight ")) { c.set(Calendar.HOUR_OF_DAY, 20); c.set(Calendar.MINUTE, 0); hasTime = found = true; }
            else if (s.contains(" evening ")) { c.set(Calendar.HOUR_OF_DAY, 18); c.set(Calendar.MINUTE, 0); hasTime = found = true; }
            else if (s.contains(" afternoon ")) { c.set(Calendar.HOUR_OF_DAY, 14); c.set(Calendar.MINUTE, 0); hasTime = found = true; }
            else if (s.contains(" morning ")) { c.set(Calendar.HOUR_OF_DAY, 9); c.set(Calendar.MINUTE, 0); hasTime = found = true; }
        }
        if (!found) return 0;
        if (!hasTime) { c.set(Calendar.HOUR_OF_DAY, 9); c.set(Calendar.MINUTE, 0); }
        if (c.before(now)) c.add(Calendar.DAY_OF_YEAR, 1);   // "at 6pm" said at 7pm means tomorrow
        return c.getTimeInMillis();
    }
}
