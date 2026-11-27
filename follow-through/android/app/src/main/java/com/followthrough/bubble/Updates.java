package com.followthrough.bubble;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Checks the website for a newer version of the app (friends who installed the APK get updates this way too). */
final class Updates {
    static final String SITE = "https://ibidun-aliyah.github.io/Ibidun-Aliyah/";
    private static final int NID = 7900;
    private Updates() {}

    static long current(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).getLongVersionCode(); } catch (Exception e) { return 0; }
    }
    static String currentName(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
    }

    /** Blocking: returns {versionCode, versionName, whatsNew} when newer than this app, else null. */
    static JSONObject check(Context c, boolean force) {
        android.content.SharedPreferences p = Nag.prefs(c);
        long now = System.currentTimeMillis();
        if (!force && now - p.getLong("updAt", 0) < 30 * 60_000L) {
            try { JSONObject j = new JSONObject(p.getString("updLast", "{}")); return j.optLong("versionCode") > current(c) ? j : null; } catch (Exception e) { return null; }
        }
        try {
            HttpURLConnection con = (HttpURLConnection) new URL(SITE + "version.json?t=" + now).openConnection();
            con.setConnectTimeout(10000); con.setReadTimeout(10000); con.setUseCaches(false);
            try (InputStream in = con.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[4096]; int n;
                while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
                JSONObject j = new JSONObject(b.toString("UTF-8"));
                p.edit().putLong("updAt", now).putString("updLast", j.toString()).apply();
                return j.optLong("versionCode") > current(c) ? j : null;
            } finally { con.disconnect(); }
        } catch (Exception e) { return null; }
    }

    /** One notification per new version. */
    static void notifyIfNew(Context c) {
        JSONObject j = check(c, false);
        if (j == null) return;
        long code = j.optLong("versionCode");
        if (Nag.prefs(c).getLong("updNotified", 0) >= code) return;
        Nag.prefs(c).edit().putLong("updNotified", code).apply();
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel("updates") == null) nm.createNotificationChannel(new NotificationChannel("updates", "App updates", NotificationManager.IMPORTANCE_DEFAULT));
        Intent dl = new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + "follow-through.apk")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        String text = j.optString("whatsNew", "New things from Bisi.");
        Notification n = new Notification.Builder(c, "updates")
                .setSmallIcon(R.drawable.ic_notify).setColor(c.getColor(R.color.accent))
                .setLargeIcon(android.graphics.drawable.Icon.createWithResource(c, R.drawable.bisi_party))
                .setContentTitle("🐝 Follow-Through " + j.optString("versionName") + " is out")
                .setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text + "\nTap to download, then open it and tap Update."))
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(c, NID, dl, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
                .build();
        try { nm.notify(NID, n); } catch (SecurityException ignored) {}
    }
}
