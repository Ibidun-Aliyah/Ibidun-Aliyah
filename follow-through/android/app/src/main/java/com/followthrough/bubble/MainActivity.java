package com.followthrough.bubble;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

/**
 * Home screen: the live dashboard (assets/dashboard.html) showing what's in your sheet.
 * The page talks to your sheet through the small bridge below.
 */
public class MainActivity extends Activity {
    private static final int PICK_FILE = 7;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private boolean loaded;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Tracker.connection(this) == null) {
            startActivity(new Intent(this, SettingsActivity.class));
        }
        try { Nag.schedule(this); } catch (Throwable e) { android.util.Log.e("FollowThrough", "schedule", e); }
        try {
            if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1);
            }
        } catch (Throwable e) { android.util.Log.e("FollowThrough", "permission", e); }
        showLastCrash();
        buildWeb();
    }

    private int renderCrashes;

    /** Creates the dashboard web view. Called again if its process dies, instead of crashing the app. */
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void buildWeb() {
        loaded = false;
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                openExternal(r.getUrl().toString());
                return true;
            }
            @Override public void onPageFinished(WebView v, String url) {
                loaded = true; v.postDelayed(MainActivity.this::checkClipboard, 1500);
                handleExtras(getIntent());
                pushUpdateInfo(false);
            }

            @Override
            public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail detail) {
                // The dashboard's page process died (low memory or a WebView bug). Rebuild it, don't crash.
                if (v == web) {
                    android.view.ViewGroup parent = (android.view.ViewGroup) v.getParent();
                    if (parent != null) parent.removeView(v);
                    v.destroy();
                    if (++renderCrashes <= 3) buildWeb();
                    else showFallback();
                } else {
                    v.destroy();
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                String[] accept = params.getAcceptTypes();
                boolean imagesOnly = accept != null && accept.length == 1 && "image/*".equals(accept[0]);
                if (imagesOnly) pick.setType("image/*");   // "Upload screenshots"
                else {
                    pick.setType("*/*");
                    pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                            "application/pdf", "image/*", "text/plain",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"});
                }
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(pick, imagesOnly ? "Choose screenshots" : "Choose files"), PICK_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/dashboard.html");
    }

    /** If the dashboard keeps failing to load, keep the app usable instead of closing. */
    private void showFallback() {
        android.widget.LinearLayout box = new android.widget.LinearLayout(this);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        int pad = (int) (24 * getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad * 2, pad, pad);
        android.widget.TextView t = new android.widget.TextView(this);
        t.setText("The dashboard couldn't load on this phone right now. Your bubble, reminders and sheet still work.\n\nTry closing other apps, or update “Android System WebView” in the Play Store.");
        t.setTextSize(16);
        box.addView(t);
        android.widget.Button sheet = new android.widget.Button(this);
        sheet.setText("Open my tracker sheet");
        sheet.setOnClickListener(v -> openExternal(Tracker.prefs(this).getString("sheetUrl", "https://sheets.google.com")));
        box.addView(sheet);
        android.widget.Button retry = new android.widget.Button(this);
        retry.setText("Try again");
        retry.setOnClickListener(v -> { renderCrashes = 0; buildWeb(); });
        box.addView(retry);
        android.widget.Button settings = new android.widget.Button(this);
        settings.setText("Settings");
        settings.setOnClickListener(v -> startActivity(new Intent(this, SettingsActivity.class)));
        box.addView(settings);
        setContentView(box);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && loaded) checkClipboard();
    }

    /** Android only lets the app read the clipboard while it's on screen: offer to save a copied link. */
    private void checkClipboard() {
        String url = clipLink();
        if (url == null) return;
        android.content.SharedPreferences p = Tracker.prefs(this);
        if (url.equals(p.getString("lastClip", ""))) return;
        p.edit().putString("lastClip", url).apply();
        if (web != null && web.getParent() != null) web.evaluateJavascript("window.__clip && window.__clip(" + JSONObject.quote(url) + ")", null);
    }

    private String clipLink() {
        try {
            android.content.ClipboardManager cm = getSystemService(android.content.ClipboardManager.class);
            if (cm == null || !cm.hasPrimaryClip() || cm.getPrimaryClip().getItemCount() == 0) return null;
            CharSequence t = cm.getPrimaryClip().getItemAt(0).coerceToText(this);
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("https?://\\S+").matcher(t == null ? "" : t);
            return m.find() ? m.group() : null;
        } catch (Exception e) { return null; }
    }

    private WebView printView;

    @Override
    protected void onResume() {
        super.onResume();
        Focus.reset(this);   // you came back: the scrolling session is over
        if (Tracker.queued(this) > 0) Tracker.flushQueue(this, null);
        if (loaded && web != null) web.evaluateJavascript("window.__onResume && window.__onResume()", null);
        pushUpdateInfo(false);
    }

    /** Tells the dashboard about a newer version (checked natively: no web restrictions, cached for 30 min). */
    private void pushUpdateInfo(boolean force) {
        final android.content.Context app = getApplicationContext();
        new Thread(() -> {
            JSONObject j = Updates.check(app, force);
            final String js = "window.__update && window.__update(" + (j == null ? "null" : j.toString()) + "," + force + ")";
            runOnUiThread(() -> { if (loaded && web != null) web.evaluateJavascript(js, null); });
        }).start();
    }

    /** Widgets and notifications open the app on a particular screen. */
    private void handleExtras(Intent intent) {
        if (intent == null || web == null) return;
        String note = intent.getStringExtra("openNote");
        if (note != null) { intent.removeExtra("openNote"); web.evaluateJavascript("window.__openNote && window.__openNote(" + JSONObject.quote(note) + ")", null); }
        if (intent.hasExtra("newNote")) { intent.removeExtra("newNote"); web.evaluateJavascript("window.__newNote && window.__newNote()", null); }
        if (intent.hasExtra("openGames")) { intent.removeExtra("openGames"); web.evaluateJavascript("window.__openGames && window.__openGames()", null); }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (loaded && web != null) handleExtras(intent);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK_FILE && fileCallback != null) {
            Uri[] result = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    android.content.ClipData cd = data.getClipData();
                    result = new Uri[cd.getItemCount()];
                    for (int i = 0; i < cd.getItemCount(); i++) result[i] = cd.getItemAt(i).getUri();
                } else if (data.getData() != null) result = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web == null || web.getParent() == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(function(){return window.__back?window.__back():0})()",
                v -> { if (!"1".equals(v)) MainActivity.super.onBackPressed(); });
    }

    /** If the app crashed last time, show what went wrong with a Copy button. */
    private void showLastCrash() {
        android.content.SharedPreferences p = getSharedPreferences("crash", MODE_PRIVATE);
        final String last = p.getString("last", null);
        if (last == null) return;
        p.edit().remove("last").apply();
        new android.app.AlertDialog.Builder(this)
                .setTitle("Follow-Through crashed last time")
                .setMessage("Copy this and send it to Claude so it can be fixed:\n\n" + last.substring(0, Math.min(last.length(), 1500)))
                .setPositiveButton("Copy", (d, w) -> {
                    getSystemService(android.content.ClipboardManager.class)
                            .setPrimaryClip(android.content.ClipData.newPlainText("crash", last));
                    android.widget.Toast.makeText(this, "Copied", android.widget.Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void openExternal(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
    }

    /** Methods the dashboard page can call as window.Android.* */
    private class Bridge {
        @JavascriptInterface
        public void request(String json, String id) {
            Tracker.call(MainActivity.this, json, res -> {
                if (web != null && web.getParent() != null) web.evaluateJavascript("window.__fromApp(" + JSONObject.quote(id) + "," + JSONObject.quote(res) + ")", null);
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            if (url != null && (url.startsWith("https://") || url.startsWith("http://"))) runOnUiThread(() -> openExternal(url));
        }

        @JavascriptInterface
        public void saveDashboard(String json) { Nag.saveDashboard(MainActivity.this, json); }

        @JavascriptInterface
        public void markActive() { Nag.markActive(MainActivity.this); }

        @JavascriptInterface
        public String getSkin() { return Nag.prefs(MainActivity.this).getString("skin", "hive"); }

        @JavascriptInterface
        public void setSkin(String skin) {
            Nag.prefs(MainActivity.this).edit().putString("skin", "garden".equals(skin) || "grunge".equals(skin) ? skin : "hive").apply();
            Nag.updateWidget(MainActivity.this);
        }

        @JavascriptInterface
        public String getMode() {
            android.content.SharedPreferences p = Nag.prefs(MainActivity.this);
            return p.getString("mode", "garden".equals(p.getString("skin", "hive")) ? "auto" : "light");
        }

        @JavascriptInterface
        public void setMode(String mode) {
            String m = "dark".equals(mode) ? "dark" : "light".equals(mode) ? "light" : "auto";
            Nag.prefs(MainActivity.this).edit().putString("mode", m).apply();
        }

        @JavascriptInterface
        public int streak() { return Nag.streak(MainActivity.this); }

        @JavascriptInterface
        public int lostStreak() { return Nag.lostStreak(MainActivity.this); }

        @JavascriptInterface
        public String webAppUrl() { String[] c = Tracker.connection(MainActivity.this); return c == null ? "" : c[0]; }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                android.content.ClipboardManager cm = getSystemService(android.content.ClipboardManager.class);
                cm.setPrimaryClip(android.content.ClipData.newPlainText("Applied history", text));
            });
        }

        /* ---- notes ---- */
        @JavascriptInterface
        public String notesGet() { return Notes.all(MainActivity.this).toString(); }

        @JavascriptInterface
        public String notesSave(String json) {
            try { return Notes.save(MainActivity.this, new JSONObject(json)).toString(); } catch (Exception e) { return "{}"; }
        }

        /** Reads a web page's text in the background; answers through window.__fromApp(id, json). */
        @JavascriptInterface
        public void fetchPage(String url, String id) {
            new Thread(() -> {
                String t = Tracker.pageText(url == null ? "" : url);
                String json;
                try { json = new JSONObject().put("ok", !t.isEmpty()).put("text", t).toString(); } catch (Exception e) { json = "{\"ok\":false}"; }
                final String fj = json;
                runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.__fromApp(" + JSONObject.quote(id) + "," + JSONObject.quote(fj) + ")", null); });
            }).start();
        }

        /** The clipboard's text (the app is in front, so Android allows it). */
        @JavascriptInterface
        public String clipText() {
            try {
                android.content.ClipData c = getSystemService(android.content.ClipboardManager.class).getPrimaryClip();
                if (c == null || c.getItemCount() == 0) return "";
                CharSequence t = c.getItemAt(0).coerceToText(MainActivity.this);
                return t == null ? "" : t.toString();
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void share(String text, String url) {
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text + "\n" + url);
                startActivity(Intent.createChooser(send, "Send your invite"));
            });
        }

        @JavascriptInterface
        public String appVersionName() { return Updates.currentName(MainActivity.this); }

        @JavascriptInterface
        public void checkUpdate() { pushUpdateInfo(true); }

        @JavascriptInterface
        public long appVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).getLongVersionCode(); } catch (Exception e) { return 0; }
        }

        @JavascriptInterface
        public int queued() { return Tracker.queued(MainActivity.this); }

        @JavascriptInterface
        public String focusGet() { return Focus.settingsJson(MainActivity.this); }

        @JavascriptInterface
        public void focusSet(String json) { Focus.saveSettings(MainActivity.this, json); }

        @JavascriptInterface
        public void notesDelete(String id) { Notes.delete(MainActivity.this, id); }

        @JavascriptInterface
        public double notesParse(String text) { return Notes.parseWhen(text == null ? "" : text); }

        @JavascriptInterface
        public void voice() { runOnUiThread(() -> startActivity(new Intent(MainActivity.this, VoiceActivity.class))); }

        @JavascriptInterface
        public void pasteLink() {
            runOnUiThread(() -> {
                String url = clipLink();
                if (url == null) android.widget.Toast.makeText(MainActivity.this, "Copy a link first, then tap Paste a link.", android.widget.Toast.LENGTH_SHORT).show();
                else web.evaluateJavascript("window.__clip && window.__clip(" + JSONObject.quote(url) + ")", null);
            });
        }

        /** Saves a text file (e.g. the CSV export) into Downloads. */
        @JavascriptInterface
        public void saveFile(String name, String mime, String content) {
            runOnUiThread(() -> {
                try {
                    android.content.ContentValues v = new android.content.ContentValues();
                    v.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(android.provider.MediaStore.Downloads.MIME_TYPE, mime);
                    Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    try (java.io.OutputStream os = getContentResolver().openOutputStream(uri)) {
                        os.write(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    }
                    android.widget.Toast.makeText(MainActivity.this, "Saved to Downloads: " + name, android.widget.Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    android.widget.Toast.makeText(MainActivity.this, "Couldn't save the file.", android.widget.Toast.LENGTH_LONG).show();
                }
            });
        }

        /* ---- Bee Pouch: documents kept privately inside the app ---- */
        private java.io.File pouchFile(String id) {
            java.io.File dir = new java.io.File(getFilesDir(), "pouch");
            if (!dir.exists()) dir.mkdirs();
            return new java.io.File(dir, id.replaceAll("[^A-Za-z0-9_-]", "_"));
        }

        @JavascriptInterface
        public boolean pouchPut(String id, String b64) {
            try (java.io.FileOutputStream os = new java.io.FileOutputStream(pouchFile(id))) {
                os.write(android.util.Base64.decode(b64, android.util.Base64.DEFAULT));
                return true;
            } catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public String pouchGet(String id) {
            java.io.File f = pouchFile(id);
            if (!f.exists()) return "";
            try (java.io.FileInputStream in = new java.io.FileInputStream(f)) {
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[16384]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP);
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void pouchDel(String id) { pouchFile(id).delete(); }

        /** Copies a pouch file to Downloads/Bee Pouch, then opens it (or shares it, e.g. to WhatsApp or Gmail). */
        @JavascriptInterface
        public void pouchOpen(String id, String name, String mime, boolean share) {
            runOnUiThread(() -> {
                try {
                    android.content.ContentValues v = new android.content.ContentValues();
                    v.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(android.provider.MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(android.provider.MediaStore.Downloads.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS + "/Bee Pouch");
                    Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    try (java.io.OutputStream os = getContentResolver().openOutputStream(uri);
                         java.io.FileInputStream in = new java.io.FileInputStream(pouchFile(id))) {
                        byte[] buf = new byte[16384]; int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                    }
                    Intent it = share
                            ? new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri)
                            : new Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime);
                    it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(it, share ? "Send " + name : "Open " + name));
                } catch (Exception e) {
                    android.widget.Toast.makeText(MainActivity.this, "Couldn't open that file.", android.widget.Toast.LENGTH_LONG).show();
                }
            });
        }

        /** Opens Android's print screen, where "Save as PDF" is one of the printers. */
        @JavascriptInterface
        public void printHtml(String html, String title) {
            runOnUiThread(() -> {
                printView = new WebView(MainActivity.this);
                printView.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView v, String url) {
                        android.print.PrintManager pm = getSystemService(android.print.PrintManager.class);
                        pm.print(title, v.createPrintDocumentAdapter(title), new android.print.PrintAttributes.Builder().build());
                    }
                });
                printView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> startActivity(new Intent(MainActivity.this, SettingsActivity.class)));
        }
    }
}
