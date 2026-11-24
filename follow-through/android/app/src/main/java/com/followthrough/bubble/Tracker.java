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
    /** Actions that can wait in the queue when there's no internet. */
    private static final java.util.Set<String> OFFLINE_OK = new java.util.HashSet<>(Arrays.asList("update", "tipUpdate", "delete", "capture"));

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

            enrich(body);
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
            String action = "";
            try { action = new JSONObject(json).optString("action"); } catch (Exception ignored) {}
            if (conn == null) out = "{\"ok\":false,\"error\":\"not_connected\"}";
            else {
                // Send anything done offline first, so the dashboard shows it.
                if (action.equals("dashboard") && queued(ctx) > 0) flushQueueNow(ctx);
                String req = json;
                if (action.equals("capture")) { try { JSONObject b = new JSONObject(json); enrich(b); req = b.toString(); } catch (Exception ignored) {} }
                try { out = http(conn[0], req, 330000); }
                catch (Exception e) {
                    out = "{\"ok\":false,\"error\":\"network\"}";
                    // Offline: keep simple edits on the phone and send them later.
                    if (OFFLINE_OK.contains(action)) {
                        try { enqueue(ctx, new JSONObject(req)); out = "{\"ok\":true,\"queued\":true}"; } catch (Exception ignored) {}
                    }
                }
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
                    if (x.has("duplicateOf")) { sb.append("Already tracked: ").append(x.optString("duplicateTitle", x.optString("title"))).append(" (merged)"); continue; }
                    sb.append(x.optString("category")).append(": ").append(x.optString("title", ""));
                    if (!x.optString("deadline").isEmpty()) sb.append(" (due ").append(x.optString("deadline")).append(")");
                }
                if (cb != null) cb.done(sb.length() > 0, sb.length() > 0 ? "Sorted ✓ " + sb : "");
                Nag.refreshAsync(ctx);
            } catch (Exception e) { if (cb != null) cb.done(false, ""); }
        });
    }

    /* ---------- read the page behind a link (so the AI sees more than a URL) ---------- */

    /** If a capture has a link but little text, add the page's readable text. Blocking; call off the main thread. */
    static void enrich(JSONObject body) {
        try {
            String url = body.optString("url"), text = body.optString("screenText");
            if (url.isEmpty() || !url.startsWith("http") || body.has("imageBase64") && text.length() > 300 || text.length() > 600) return;
            String page = pageText(url);
            if (page.isEmpty()) return;
            body.put("screenText", (text.isEmpty() || text.equals(url) ? "" : text + "\n\n") + "PAGE TEXT (" + url + "):\n" + page);
        } catch (Exception ignored) {}
    }

    static String pageText(String url) {
        try {
            HttpURLConnection con = null;
            String u = url;
            for (int hop = 0; hop < 5; hop++) {
                con = (HttpURLConnection) new URL(u).openConnection();
                con.setConnectTimeout(8000); con.setReadTimeout(10000);
                con.setInstanceFollowRedirects(false);
                con.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36");
                con.setRequestProperty("Accept", "text/html,*/*;q=0.8");
                int code = con.getResponseCode();
                if (code >= 300 && code < 400 && con.getHeaderField("Location") != null) { u = new URL(new URL(u), con.getHeaderField("Location")).toString(); con.disconnect(); continue; }
                break;
            }
            String type = con.getContentType() == null ? "" : con.getContentType();
            if (!type.contains("html") && !type.contains("text")) { con.disconnect(); return ""; }
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            try (InputStream in = con.getInputStream()) {
                byte[] b = new byte[16384]; int n;
                while ((n = in.read(b)) > 0 && buf.size() < 1_500_000) buf.write(b, 0, n);
            } finally { con.disconnect(); }
            String html = buf.toString("UTF-8");
            String title = match(html, "(?is)<title[^>]*>(.*?)</title>");
            String desc = match(html, "(?is)<meta[^>]+(?:name|property)=[\"'](?:og:)?description[\"'][^>]+content=[\"']([^\"']*)");
            String body = html.replaceAll("(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\\1>", " ")
                    .replaceAll("(?i)<br\\s*/?>|</p>|</li>|</h[1-6]>|</div>|</tr>", "\n")
                    .replaceAll("(?s)<[^>]+>", " ");
            String text = decode(body).replaceAll("[ \\t\\x0B\\f\\r]+", " ").replaceAll("\\s*\n\\s*", "\n").replaceAll("\n{3,}", "\n\n").trim();
            StringBuilder out = new StringBuilder();
            if (!title.isEmpty()) out.append("Title: ").append(decode(title).trim()).append('\n');
            if (!desc.isEmpty()) out.append("Description: ").append(decode(desc).trim()).append('\n');
            out.append(text.length() > 14000 ? text.substring(0, 14000) : text);
            return out.toString();
        } catch (Exception e) { return ""; }
    }
    private static String match(String s, String re) { java.util.regex.Matcher m = java.util.regex.Pattern.compile(re).matcher(s); return m.find() ? m.group(1) : ""; }
    private static String decode(String s) {
        return s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").replace("&rsquo;", "’").replace("&lsquo;", "‘")
                .replace("&ldquo;", "“").replace("&rdquo;", "”").replace("&ndash;", "–").replace("&mdash;", "—").replace("&lt;", "<").replace("&gt;", ">").replace("&#8211;", "–").replace("&#8217;", "’").replace("&#8220;", "“").replace("&#8221;", "”").replace("&#038;", "&");
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

    private static synchronized int flushQueueNow(Context c) {
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

    /** Several images of one post side by side (2 columns, numbered), to be read as one. */
    static Bitmap combine(java.util.List<Bitmap> parts) {
        int cols = 2, cell = 760, gap = 16;
        int rows = (parts.size() + 1) / 2;
        int[] rowH = new int[rows];
        for (int i = 0; i < parts.size(); i++) {
            Bitmap p = parts.get(i);
            rowH[i / cols] = Math.max(rowH[i / cols], p.getHeight() * cell / Math.max(1, p.getWidth()));
        }
        int W = cols * cell + (cols + 1) * gap, H = gap;
        for (int r : rowH) H += r + gap;
        Bitmap out = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        android.graphics.Canvas c = new android.graphics.Canvas(out);
        c.drawColor(android.graphics.Color.WHITE);
        android.graphics.Paint box = new android.graphics.Paint(); box.setColor(android.graphics.Color.parseColor("#1E1606"));
        android.graphics.Paint num = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        num.setColor(android.graphics.Color.parseColor("#FFC629")); num.setTextSize(36); num.setFakeBoldText(true);
        int y = gap;
        for (int r = 0; r < rows; r++) {
            for (int k = 0; k < cols; k++) {
                int i = r * cols + k; if (i >= parts.size()) break;
                Bitmap p = parts.get(i);
                int x = gap + k * (cell + gap), h = p.getHeight() * cell / Math.max(1, p.getWidth());
                c.drawBitmap(p, null, new android.graphics.Rect(x, y, x + cell, y + h), null);
                c.drawRect(x, y, x + 64, y + 52, box);
                c.drawText(String.valueOf(i + 1), x + 20, y + 40, num);
            }
            y += rowH[r] + gap;
        }
        return out;
    }

    static String jpegBase64(Bitmap src) {
        Bitmap b = src;
        int w = src.getWidth(), h = src.getHeight();
        int max = h > w * 2.5 || w > 1500 ? 4800 : 1400;   // combined carousels stay readable
        if (Math.max(w, h) > max) {
            float s = (float) max / Math.max(w, h);
            b = Bitmap.createScaledBitmap(src, Math.round(w * s), Math.round(h * s), true);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG, 72, out);
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }
}
