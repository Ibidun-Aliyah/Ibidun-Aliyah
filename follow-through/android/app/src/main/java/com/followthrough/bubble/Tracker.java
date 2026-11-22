package com.followthrough.bubble;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Talks to the Google Sheet (through the Apps Script web app).
 * Captures that can't be sent right away are kept in a small queue on the
 * phone and sent the next time there's a connection.
 */
final class Tracker {
    interface Done { void done(boolean ok, String message); }
    interface Result { void result(String json); }

    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    /** Slow calls (AI sorting, essays, CV) run here so they never hold up captures. */
    private static final ExecutorService SLOW = Executors.newCachedThreadPool();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final String PREFS = "follow_through";

    private Tracker() {}

    /* ---------- connection: the Apps Script web app URL ---------- */

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Returns {web app URL} or null when it doesn't look like an Apps Script web app link. */
    static String[] parseCode(String code) {
        if (code == null) return null;
        code = code.trim();
        int q = code.indexOf('?');
        if (q >= 0) code = code.substring(0, q);          // older codes had ?token=…
        if (!code.startsWith("https://script.google.com/") || !code.endsWith("/exec")) return null;
        return new String[]{code};
    }

    static String[] connection(Context c) {
        return parseCode(prefs(c).getString("code", null));
    }

    /* ---------- capture ---------- */

    static void capture(Context c, String app, String url, String screenText, Bitmap shot, String note, Done cb) {
        final Context ctx = c.getApplicationContext();
        IO.execute(() -> {
            JSONObject body = new JSONObject();
            try {
                body.put("action", "capture");
                body.put("app", app == null ? "" : app);
                body.put("url", url == null ? "" : url);
                body.put("screenText", screenText == null ? "" : screenText);
                body.put("note", note == null ? "" : note);
                if (shot != null) body.put("imageBase64", jpegBase64(shot));
            } catch (Exception ignored) {}

            boolean ok = send(ctx, body);
            if (!ok) enqueue(ctx, body);
            else flushQueueNow(ctx);
            String msg = ok ? "Saved to your tracker" :
                    (connection(ctx) == null ? "Saved on your phone. Connect your sheet in the app to send it."
                            : "No connection. Saved on your phone and will send later.");
            MAIN.post(() -> cb.done(ok, msg));
        });
    }

    static void ping(Context c, Done cb) {
        final Context ctx = c.getApplicationContext();
        IO.execute(() -> {
            String[] conn = connection(ctx);
            String msg; boolean ok = false;
            if (conn == null) msg = "That link doesn't look right. It should start with https://script.google.com/ and end with /exec";
            else {
                try {
                    String res = http(conn[0] + "?action=ping", null, 30000);
                    JSONObject j = new JSONObject(res);
                    ok = j.optBoolean("ok");
                    if (ok) prefs(ctx).edit().putString("sheetUrl", j.optString("sheetUrl")).apply();
                    msg = ok ? "Connected to “" + j.optString("sheet") + "”" : "Sheet error: " + j.optString("error");
                } catch (Exception e) {
                    msg = "Couldn't reach the sheet. Check the link, that the deployment's access is “Anyone”, and your internet.";
                }
            }
            final boolean fOk = ok; final String fMsg = msg;
            MAIN.post(() -> cb.done(fOk, fMsg));
        });
    }

    /**
     * Any request to the sheet (used by the dashboard). Calls back on the main thread with
     * the JSON answer, or {"ok":false,"error":...}.
     */
    static void call(Context c, String json, Result cb) {
        final Context ctx = c.getApplicationContext();
        SLOW.execute(() -> {
            String out;
            String[] conn = connection(ctx);
            if (conn == null) out = "{\"ok\":false,\"error\":\"not_connected\"}";
            else {
                try { out = http(conn[0], json, 330000); }
                catch (Exception e) { out = "{\"ok\":false,\"error\":\"network\"}"; }
            }
            final String fOut = out;
            MAIN.post(() -> cb.result(fOut));
        });
    }

    /** Same as call(), but blocking: for background jobs only. */
    static String callBlocking(Context c, String json, int timeoutMs) {
        String[] conn = connection(c);
        if (conn == null) return "{\"ok\":false,\"error\":\"not_connected\"}";
        try { return http(conn[0], json, timeoutMs); }
        catch (Exception e) { return "{\"ok\":false,\"error\":\"network\"}"; }
    }

    /** After a capture: sort new rows straight away (needs the Gemini key in the sheet). */
    static void sortNow(Context c, Done cb) {
        final Context ctx = c.getApplicationContext();
        Nag.markActive(ctx);
        call(c, "{\"action\":\"process\"}", res -> {
            try {
                JSONObject j = new JSONObject(res);
                if (!j.optBoolean("ok")) { if (cb != null) cb.done(false, ""); return; }
                org.json.JSONArray done = j.optJSONArray("processed");
                StringBuilder sb = new StringBuilder();
                for (int i = 0; done != null && i < done.length(); i++) {
                    JSONObject x = done.getJSONObject(i);
                    if (x.has("error")) continue;
                    if (sb.length() > 0) sb.append("; ");
                    sb.append(x.optString("category")).append(": ").append(x.optString("title", ""));
                    if (!x.optString("deadline").isEmpty()) sb.append(" (due ").append(x.optString("deadline")).append(")");
                }
                if (cb != null) cb.done(sb.length() > 0, sb.length() > 0 ? "Sorted ✓ " + sb : "");
                Nag.refreshAsync(ctx);
            } catch (Exception e) { if (cb != null) cb.done(false, ""); }
        });
    }

    /* ---------- queue ---------- */

    static int queued(Context c) {
        File[] f = queueDir(c).listFiles();
        return f == null ? 0 : f.length;
    }

    static void flushQueue(Context c, Done cb) {
        final Context ctx = c.getApplicationContext();
        IO.execute(() -> {
            int left = flushQueueNow(ctx);
            if (cb != null) MAIN.post(() -> cb.done(left == 0, left == 0 ? "All captures sent" : left + " still waiting"));
        });
    }

    private static int flushQueueNow(Context c) {
        File[] files = queueDir(c).listFiles();
        if (files == null) return 0;
        Arrays.sort(files);
        int left = 0;
        for (File f : files) {
            try {
                JSONObject body = new JSONObject(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
                if (send(c, body)) f.delete(); else left++;
            } catch (Exception e) { left++; }
        }
        return left;
    }

    private static void enqueue(Context c, JSONObject body) {
        try (FileOutputStream out = new FileOutputStream(new File(queueDir(c), System.currentTimeMillis() + ".json"))) {
            out.write(body.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
    }

    private static File queueDir(Context c) {
        File d = new File(c.getFilesDir(), "queue");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /* ---------- network ---------- */

    private static boolean send(Context c, JSONObject body) {
        String[] conn = connection(c);
        if (conn == null) return false;
        try {
            String res = http(conn[0], body.toString(), 30000);
            return new JSONObject(res).optBoolean("ok");
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Apps Script answers a POST with a redirect to the result page, so the
     * redirect is followed by hand with a GET.
     */
    private static String http(String url, String postJson, int readTimeoutMs) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(readTimeoutMs);
        con.setInstanceFollowRedirects(postJson == null);
        if (postJson != null) {
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            try (OutputStream os = con.getOutputStream()) {
                os.write(postJson.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = con.getResponseCode();
        if (code >= 300 && code < 400) {
            String loc = con.getHeaderField("Location");
            con.disconnect();
            return http(loc, null, readTimeoutMs);
        }
        try (InputStream in = code >= 400 ? con.getErrorStream() : con.getInputStream()) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while (in != null && (n = in.read(b)) > 0) buf.write(b, 0, n);
            return buf.toString("UTF-8");
        } finally {
            con.disconnect();
        }
    }

    /* ---------- images ---------- */

    static String jpegBase64(Bitmap src) {
        Bitmap b = src;
        int max = 1400;
        int w = src.getWidth(), h = src.getHeight();
        if (Math.max(w, h) > max) {
            float s = (float) max / Math.max(w, h);
            b = Bitmap.createScaledBitmap(src, Math.round(w * s), Math.round(h * s), true);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG, 72, out);
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }
}
