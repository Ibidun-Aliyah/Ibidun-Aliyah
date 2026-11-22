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

    @Override
    protected void onResume() {
        super.onResume();
        if (loaded) web.evaluateJavascript("window.__onResume && window.__onResume()", null);
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
        web.evaluateJavascript("(function(){var s=document.getElementById('sheet');if(s&&!s.hidden){document.getElementById('scrim').click();return 1}return 0})()",
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
            Tracker.call(MainActivity.this, json, res ->
                    web.evaluateJavascript("window.__fromApp(" + JSONObject.quote(id) + "," + JSONObject.quote(res) + ")", null));
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
