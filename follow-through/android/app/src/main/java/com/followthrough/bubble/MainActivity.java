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
            @Override public void onPageFinished(WebView v, String url) { loaded = true; }

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
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/pdf", "image/*", "text/plain",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
                try {
                    startActivityForResult(Intent.createChooser(pick, "Choose your CV"), PICK_FILE);
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
    protected void onResume() {
        super.onResume();
        if (loaded && web != null) web.evaluateJavascript("window.__onResume && window.__onResume()", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK_FILE && fileCallback != null) {
            Uri[] result = (res == RESULT_OK && data != null && data.getData() != null) ? new Uri[]{data.getData()} : null;
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
            Nag.prefs(MainActivity.this).edit().putString("skin", "garden".equals(skin) ? "garden" : "hive").apply();
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

        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> startActivity(new Intent(MainActivity.this, SettingsActivity.class)));
        }
    }
}
