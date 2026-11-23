package com.followthrough.bubble;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** The extra home-screen widgets: Nectar jar, Brain snack, Sticky note and Quick save. */
final class Widgets {
    private Widgets() {}

    static final String SNACK_REVEAL = "com.followthrough.SNACK_REVEAL";
    static final String NOTE_ITEM = "com.followthrough.NOTE_ITEM";
    private static final int INK = Color.parseColor("#1E1606");

    /* ---------- providers (one per widget) ---------- */

    public static class Jar extends AppWidgetProvider {
        @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { m.updateAppWidget(ids, jar(c)); }
    }
    public static class Snack extends AppWidgetProvider {
        @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { m.updateAppWidget(ids, snack(c)); }
    }
    public static class Note extends AppWidgetProvider {
        @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { m.updateAppWidget(ids, note(c)); }
    }
    public static class Quick extends AppWidgetProvider {
        @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { m.updateAppWidget(ids, quick(c)); }
    }

    /** Taps that change a widget in place (reveal the snack answer, tick a note item). */
    public static class Receiver extends android.content.BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) {
            if (SNACK_REVEAL.equals(i.getAction())) {
                Nag.prefs(c).edit().putString("snackRevealed", Nag.today()).apply();
                update(c, Snack.class, snack(c));
            } else if (NOTE_ITEM.equals(i.getAction())) {
                JSONObject n = Notes.get(c, i.getStringExtra("id"));
                int idx = i.getIntExtra("i", -1);
                try {
                    JSONArray items = n == null ? null : n.optJSONArray("items");
                    if (items != null && idx >= 0 && idx < items.length()) {
                        JSONObject it = items.getJSONObject(idx);
                        it.put("done", !it.optBoolean("done"));
                        Notes.save(c, n);           // also refreshes this widget
                        Nag.markActive(c);
                    }
                } catch (Exception ignored) {}
            }
        }
    }

    static void updateAll(Context c) {
        update(c, Jar.class, null);
        update(c, Snack.class, null);
        update(c, Note.class, null);
        update(c, Quick.class, null);
    }

    static void updateNote(Context c) { update(c, Note.class, null); }

    private static void update(Context c, Class<?> cls, RemoteViews v) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, cls));
            if (ids.length == 0) return;
            if (v == null) v = cls == Jar.class ? jar(c) : cls == Snack.class ? snack(c) : cls == Note.class ? note(c) : quick(c);
            m.updateAppWidget(ids, v);
        } catch (Exception e) { android.util.Log.e("FollowThrough", "widget", e); }
    }

    private static PendingIntent openApp(Context c, int req, String extra, String value) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (extra != null) i.putExtra(extra, value);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /* ---------- 1. Nectar jar ---------- */

    static RemoteViews jar(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_jar);
        int streak = Nag.streak(c);
        boolean today = Nag.activeToday(c);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean tipping = streak > 0 && !today && hour >= 19;
        float frac = streak == 0 ? 0f : Math.max(0.1f, Math.min(1f, streak / 14f));
        v.setImageViewBitmap(R.id.j_jar, drawJar(frac, tipping));
        v.setTextViewText(R.id.j_days, streak + (streak == 1 ? " day" : " days"));
        String line = streak == 0 ? "Empty jar. Do one thing today 🐝"
                : tipping ? "It’s tipping! Do one thing before midnight"
                : today ? "of nectar · collected today ✓" : "of nectar. Don’t spill it.";
        v.setTextViewText(R.id.j_line, line);
        v.setOnClickPendingIntent(R.id.j_root, openApp(c, 201, null, null));
        return v;
    }

    /** A hand-drawn honey jar, filled to `frac`; tilted and dripping when the streak is in danger. */
    static Bitmap drawJar(float frac, boolean tipping) {
        int W = 300, H = 300;
        Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(b);
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG); stroke.setStyle(Paint.Style.STROKE); stroke.setColor(INK);
        stroke.setStrokeWidth(9); stroke.setStrokeJoin(Paint.Join.ROUND); stroke.setStrokeCap(Paint.Cap.ROUND);
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        if (tipping) cv.rotate(-16, W / 2f, H * 0.62f);
        // shadow
        fill.setColor(Color.argb(60, 30, 22, 6));
        cv.drawOval(new RectF(70, 268, 230, 292), fill);
        // jar body
        Path body = new Path();
        body.moveTo(78, 86); body.quadTo(70, 66, 100, 66); body.lineTo(200, 66); body.quadTo(230, 66, 222, 86);
        body.lineTo(236, 240); body.quadTo(240, 278, 196, 278); body.lineTo(104, 278); body.quadTo(60, 278, 64, 240); body.close();
        fill.setColor(Color.parseColor("#FFFDF4")); cv.drawPath(body, fill);
        // honey
        if (frac > 0) {
            float top = 270 - frac * 186;
            cv.save(); cv.clipPath(body);
            Path honey = new Path();
            honey.moveTo(40, top);
            for (int x = 40; x <= 260; x += 40) { honey.quadTo(x + 10, top - 10, x + 20, top); honey.quadTo(x + 30, top + 10, x + 40, top); }
            honey.lineTo(260, 300); honey.lineTo(40, 300); honey.close();
            fill.setColor(Color.parseColor("#F5B700")); cv.drawPath(honey, fill);
            fill.setColor(Color.parseColor("#E39B1B"));
            cv.drawRect(40, 250, 260, 300, fill);
            Paint wave = new Paint(stroke); wave.setStrokeWidth(5); wave.setColor(Color.parseColor("#B5651D"));
            cv.drawPath(honey, wave);
            cv.restore();
        }
        // shine
        Paint shine = new Paint(stroke); shine.setColor(Color.argb(200, 255, 255, 255)); shine.setStrokeWidth(10);
        cv.drawLine(92, 110, 86, 200, shine);
        cv.drawPath(body, stroke);
        // lid
        RectF lid = new RectF(88, 34, 212, 70);
        fill.setColor(Color.parseColor("#B5651D")); cv.drawRoundRect(lid, 14, 14, fill); cv.drawRoundRect(lid, 14, 14, stroke);
        // label
        RectF label = new RectF(104, 150, 196, 200);
        fill.setColor(Color.parseColor("#FFF0C0")); cv.drawRoundRect(label, 10, 10, fill);
        Paint thin = new Paint(stroke); thin.setStrokeWidth(5); cv.drawRoundRect(label, 10, 10, thin);
        Paint hex = new Paint(thin); hex.setColor(Color.parseColor("#E39B1B"));
        Path h = new Path(); float hx = 150, hy = 175, r = 14;
        for (int k = 0; k < 6; k++) { double a = Math.PI / 3 * k + Math.PI / 6; float px = (float) (hx + r * Math.cos(a)), py = (float) (hy + r * Math.sin(a)); if (k == 0) h.moveTo(px, py); else h.lineTo(px, py); }
        h.close(); cv.drawPath(h, hex);
        // little Bisi on the lid
        drawBee(cv, 196, 30, tipping);
        if (tipping) {   // the drip
            cv.rotate(16, W / 2f, H * 0.62f);
            Path drip = new Path(); drip.moveTo(58, 120); drip.quadTo(40, 170, 52, 190); drip.quadTo(66, 200, 66, 180); drip.quadTo(64, 150, 58, 120);
            fill.setColor(Color.parseColor("#F5B700")); cv.drawPath(drip, fill); cv.drawPath(drip, thin);
        }
        return b;
    }

    private static void drawBee(Canvas cv, float x, float y, boolean worried) {
        Paint s = new Paint(Paint.ANTI_ALIAS_FLAG); s.setStyle(Paint.Style.STROKE); s.setColor(INK); s.setStrokeWidth(5); s.setStrokeCap(Paint.Cap.ROUND);
        Paint f = new Paint(Paint.ANTI_ALIAS_FLAG);
        f.setColor(Color.parseColor("#DCEBFA"));
        RectF w1 = new RectF(x - 34, y - 34, x - 6, y - 14), w2 = new RectF(x + 4, y - 38, x + 34, y - 16);
        cv.drawOval(w1, f); cv.drawOval(w1, s); cv.drawOval(w2, f); cv.drawOval(w2, s);
        f.setColor(Color.parseColor("#FFC629")); cv.drawCircle(x, y, 26, f);
        cv.save(); Path clip = new Path(); clip.addCircle(x, y, 26, Path.Direction.CW); cv.clipPath(clip);
        f.setColor(INK); cv.drawRect(x - 30, y + 10, x + 30, y + 18, f); cv.restore();
        cv.drawCircle(x, y, 26, s);
        f.setColor(INK); cv.drawCircle(x - 9, y - 4, 4, f); cv.drawCircle(x + 9, y - 4, 4, f);
        Paint m = new Paint(s); m.setStrokeWidth(4);
        Path mouth = new Path();
        if (worried) { mouth.moveTo(x - 6, y + 6); mouth.quadTo(x, y + 1, x + 6, y + 6); }
        else { mouth.moveTo(x - 6, y + 3); mouth.quadTo(x, y + 9, x + 6, y + 3); }
        cv.drawPath(mouth, m);
        f.setColor(Color.parseColor("#F49A8C")); cv.drawCircle(x - 16, y + 3, 4, f); cv.drawCircle(x + 16, y + 3, 4, f);
    }

    /* ---------- 8. Brain snack ---------- */

    private static List<String[]> words;

    /** The vocabulary is read from the games file, so the widget and Word Hive share one list. */
    private static List<String[]> words(Context c) {
        if (words != null) return words;
        List<String[]> out = new ArrayList<>();
        try (InputStream in = c.getAssets().open("games.js")) {
            java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream(); byte[] bb = new byte[8192]; int k;
            while ((k = in.read(bb)) > 0) buf.write(bb, 0, k);
            String js = new String(buf.toByteArray(), StandardCharsets.UTF_8);
            Matcher m = Pattern.compile("\\['([a-z]+)','((?:[^'\\\\]|\\\\.)*)','((?:[^'\\\\]|\\\\.)*)'\\]").matcher(js);
            while (m.find()) out.add(new String[]{m.group(1), m.group(2).replace("\\'", "'"), m.group(3).replace("\\'", "'")});
        } catch (Exception ignored) {}
        if (out.isEmpty()) out.add(new String[]{"ephemeral", "lasting a very short time", "Trends on TikTok are ephemeral."});
        words = out;
        return out;
    }

    /** {kind, question, answer, extra} — the same for the whole day. */
    static String[] snackOfToday(Context c) {
        Calendar cal = Calendar.getInstance();
        int day = cal.get(Calendar.YEAR) * 400 + cal.get(Calendar.DAY_OF_YEAR);
        Random r = new Random(day * 7919L);
        switch (day % 3) {
            case 1: {   // maths
                int t = r.nextInt(5);
                if (t == 0) { int p = new int[]{15, 35, 45, 12}[r.nextInt(4)], y = new int[]{80, 120, 240, 400}[r.nextInt(4)]; return new String[]{"MATHS SNACK", p + "% of " + y + "?", trim(p * y / 100.0), ""}; }
                if (t == 1) { int b = new int[]{2, 3, 10}[r.nextInt(3)], n = 2 + r.nextInt(b == 2 ? 9 : 4); return new String[]{"MATHS SNACK", "log" + sub(b) + "(" + (long) Math.pow(b, n) + ") = ?", String.valueOf(n), ""}; }
                if (t == 2) { int a = 2 + r.nextInt(4), n = 2 + r.nextInt(3), x = 1 + r.nextInt(3); return new String[]{"MATHS SNACK", "d/dx (" + a + "x" + sup(n) + ") at x = " + x + "?", String.valueOf(a * n * (int) Math.pow(x, n - 1)), "Power rule: n·a·xⁿ⁻¹"}; }
                if (t == 3) { int n = 20 + r.nextInt(80); return new String[]{"MATHS SNACK", "1 + 2 + … + " + n + " = ?", String.valueOf(n * (n + 1) / 2), "n(n+1)/2"}; }
                int a = 11 + r.nextInt(25); return new String[]{"MATHS SNACK", a + "² = ?", String.valueOf(a * a), ""};
            }
            case 2: {   // circuits
                int t = r.nextInt(4);
                if (t == 0) { double i = new double[]{0.5, 2, 2.5, 3}[r.nextInt(4)]; int R = new int[]{4, 10, 20, 47}[r.nextInt(4)]; return new String[]{"CIRCUITS SNACK", i + " A through " + R + " Ω. Voltage?", trim(i * R) + " V", "V = IR"}; }
                if (t == 1) { int a = new int[]{6, 10, 12, 20}[r.nextInt(4)], b = new int[]{3, 15, 6, 30}[r.nextInt(4)]; return new String[]{"CIRCUITS SNACK", a + " Ω ∥ " + b + " Ω = ?", trim(a * b / (double) (a + b)) + " Ω", "R₁R₂ / (R₁+R₂)"}; }
                if (t == 2) { int n = 40 + r.nextInt(200); return new String[]{"CIRCUITS SNACK", Integer.toBinaryString(n) + "₂ in decimal?", String.valueOf(n), ""}; }
                int n = 16 + r.nextInt(240); return new String[]{"CIRCUITS SNACK", "0x" + Integer.toHexString(n).toUpperCase(Locale.ROOT) + " in decimal?", String.valueOf(n), ""};
            }
            default: {
                List<String[]> w = words(c);
                String[] x = w.get(r.nextInt(w.size()));
                return new String[]{"WORD OF THE DAY", x[0], x[1], "“" + x[2] + "”"};
            }
        }
    }

    private static String trim(double d) { return d == Math.rint(d) ? String.valueOf((long) d) : String.valueOf(Math.round(d * 100) / 100.0); }
    private static String sub(int n) { return String.valueOf(n).replace("0", "₀").replace("1", "₁").replace("2", "₂").replace("3", "₃"); }
    private static String sup(int n) { return n == 2 ? "²" : n == 3 ? "³" : n == 4 ? "⁴" : "^" + n; }

    static RemoteViews snack(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_snack);
        String[] s = snackOfToday(c);
        boolean shown = Nag.today().equals(Nag.prefs(c).getString("snackRevealed", ""));
        v.setTextViewText(R.id.s_kind, s[0]);
        v.setTextViewText(R.id.s_q, s[1]);
        v.setTextViewText(R.id.s_a, shown ? (s[0].startsWith("WORD") ? s[2] : "= " + s[2]) : "");
        v.setViewVisibility(R.id.s_a, shown ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.s_ex, s[3]);
        v.setViewVisibility(R.id.s_ex, shown && !s[3].isEmpty() ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.s_hint, shown ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.s_hint, s[0].startsWith("WORD") ? "Know it? Tap to reveal the meaning" : "Work it out, then tap to check");
        Intent reveal = new Intent(c, Receiver.class).setAction(SNACK_REVEAL);
        v.setOnClickPendingIntent(R.id.s_root, PendingIntent.getBroadcast(c, 301, reveal, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        v.setOnClickPendingIntent(R.id.s_play, openApp(c, 302, "openGames", "1"));
        return v;
    }

    /* ---------- 5. Sticky note ---------- */

    /** Pinned note first, then the next reminder, then the latest note. */
    static JSONObject chosenNote(Context c) {
        JSONArray all = Notes.all(c);
        JSONObject pinned = null, soon = null, latest = null;
        long now = System.currentTimeMillis();
        for (int i = 0; i < all.length(); i++) {
            JSONObject n = all.optJSONObject(i);
            if (n == null || n.optBoolean("done")) continue;
            if (n.optBoolean("pinned") && (pinned == null || n.optLong("updated") > pinned.optLong("updated"))) pinned = n;
            long at = n.optLong("remindAt");
            if (at > now && (soon == null || at < soon.optLong("remindAt"))) soon = n;
            if (latest == null || n.optLong("updated") > latest.optLong("updated")) latest = n;
        }
        return pinned != null ? pinned : soon != null ? soon : latest;
    }

    static RemoteViews note(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_note);
        JSONObject n = chosenNote(c);
        int[] itemIds = {R.id.n_i0, R.id.n_i1, R.id.n_i2, R.id.n_i3};
        if (n == null) {
            v.setInt(R.id.n_root, "setBackgroundResource", R.drawable.sticky_honey);
            v.setTextViewText(R.id.n_title, "No notes yet");
            v.setTextViewText(R.id.n_body, "Tap to write one. Pin a note in the app to keep it here.");
            v.setViewVisibility(R.id.n_body, View.VISIBLE);
            for (int id : itemIds) v.setViewVisibility(id, View.GONE);
            v.setViewVisibility(R.id.n_rem, View.GONE);
            v.setOnClickPendingIntent(R.id.n_root, openApp(c, 401, "newNote", "1"));
            return v;
        }
        String color = n.optString("color", "honey");
        int bg;
        switch (color) {
            case "mint": bg = R.drawable.sticky_mint; break;
            case "rose": bg = R.drawable.sticky_rose; break;
            case "sky": bg = R.drawable.sticky_sky; break;
            case "lilac": bg = R.drawable.sticky_lilac; break;
            case "paper": bg = R.drawable.sticky_paper; break;
            default: bg = R.drawable.sticky_honey;
        }
        v.setInt(R.id.n_root, "setBackgroundResource", bg);
        String[] lines = n.optString("text").split("\n", 2);
        JSONArray items = n.optJSONArray("items");
        String title = lines[0].trim();
        if (title.isEmpty() && items != null && items.length() > 0) title = items.optJSONObject(0).optString("t");
        v.setTextViewText(R.id.n_title, (n.optBoolean("pinned") ? "📌 " : "") + (title.isEmpty() ? "Your note" : title));
        String body = lines.length > 1 ? lines[1].trim() : "";
        v.setTextViewText(R.id.n_body, body);
        v.setViewVisibility(R.id.n_body, body.isEmpty() ? View.GONE : View.VISIBLE);
        String id = n.optString("id");
        for (int i = 0; i < itemIds.length; i++) {
            JSONObject it = items == null ? null : items.optJSONObject(i);
            if (it == null) { v.setViewVisibility(itemIds[i], View.GONE); continue; }
            boolean done = it.optBoolean("done");
            v.setTextViewText(itemIds[i], (done ? "☑  " : "☐  ") + it.optString("t"));
            v.setViewVisibility(itemIds[i], View.VISIBLE);
            Intent tick = new Intent(c, Receiver.class).setAction(NOTE_ITEM).putExtra("id", id).putExtra("i", i)
                    .setData(android.net.Uri.parse("ft://note/" + id + "/" + i));
            v.setOnClickPendingIntent(itemIds[i], PendingIntent.getBroadcast(c, 410 + i, tick, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        }
        long at = n.optLong("remindAt");
        if (at > 0) {
            String when = new SimpleDateFormat(sameDay(at) ? "'Today' h:mm a" : "EEE d MMM, h:mm a", Locale.getDefault()).format(new Date(at));
            v.setTextViewText(R.id.n_rem, "⏰ " + when);
            v.setViewVisibility(R.id.n_rem, View.VISIBLE);
        } else v.setViewVisibility(R.id.n_rem, View.GONE);
        v.setOnClickPendingIntent(R.id.n_root, openApp(c, 402, "openNote", id));
        return v;
    }

    private static boolean sameDay(long ms) {
        Calendar a = Calendar.getInstance(), b = Calendar.getInstance(); b.setTimeInMillis(ms);
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR);
    }

    /* ---------- 7. Quick save ---------- */

    static RemoteViews quick(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_quick);
        Intent voice = new Intent(c, VoiceActivity.class).putExtra("fromBubble", true).putExtra("fromWidget", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.q_voice, PendingIntent.getActivity(c, 501, voice, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        Intent paste = new Intent(c, ClipActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.q_paste, PendingIntent.getActivity(c, 502, paste, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        v.setOnClickPendingIntent(R.id.q_note, openApp(c, 503, "newNote", "1"));
        return v;
    }
}
