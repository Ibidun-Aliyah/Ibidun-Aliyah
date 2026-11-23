package com.followthrough.bubble;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.os.Bundle;
import android.widget.Toast;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Quick save widget → "Paste link": saves whatever link (or text) you just copied, then disappears. */
public class ClipActivity extends Activity {
    private boolean done;

    @Override protected void onCreate(Bundle b) { super.onCreate(b); }

    /** Android only lets an app read the clipboard once its window has focus. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || done) return;
        done = true;
        String text = "";
        try {
            ClipData clip = getSystemService(ClipboardManager.class).getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) { CharSequence t = clip.getItemAt(0).coerceToText(this); text = t == null ? "" : t.toString().trim(); }
        } catch (Exception ignored) {}
        if (text.isEmpty()) { Toast.makeText(this, "Copy a link first, then tap Paste link. 🐝", Toast.LENGTH_LONG).show(); finish(); return; }
        Matcher m = Pattern.compile("https?://\\S+").matcher(text);
        String url = m.find() ? m.group() : "";
        final android.content.Context app = getApplicationContext();
        Tracker.capture(app, "Copied link", url, text, null, null, (ok, msg) -> {
            Toast.makeText(app, ok ? "Saved 🐝 Sorting it now…" : msg, Toast.LENGTH_SHORT).show();
            if (ok) Tracker.sortNow(app, (sorted, what) -> { if (sorted) Toast.makeText(app, what, Toast.LENGTH_LONG).show(); });
        });
        finish();
    }
}
