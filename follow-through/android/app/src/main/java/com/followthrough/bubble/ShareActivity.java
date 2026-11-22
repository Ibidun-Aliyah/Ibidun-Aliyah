package com.followthrough.bubble;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

/** "Share → Save to Follow-Through" from any app. Sends what was shared and closes at once. */
public class ShareActivity extends Activity {
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Intent in = getIntent();
        String text = in.getStringExtra(Intent.EXTRA_TEXT);
        String subject = in.getStringExtra(Intent.EXTRA_SUBJECT);
        @SuppressWarnings("deprecation")
        final Uri image = android.os.Build.VERSION.SDK_INT >= 33
                ? in.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class)
                : in.getParcelableExtra(Intent.EXTRA_STREAM);

        final String body = ((subject != null ? subject + "\n" : "") + (text != null ? text : "")).trim();
        String found = null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("https?://\\S+").matcher(body);
        if (m.find()) found = m.group();
        final String url = found;
        final String from = getReferrer() != null ? getReferrer().getHost() : null;

        // Link-only share (Instagram, X, LinkedIn…): let the bubble screenshot the post once we close.
        if (image == null && BubbleService.instance != null) {
            BubbleService.instance.captureAfterShare(body, url);
            Toast.makeText(this, "Saving with a screenshot…", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        Toast.makeText(this, "Saving…", Toast.LENGTH_SHORT).show();
        // Decode a shared image off the main thread, while we still have permission to read it.
        new Thread(() -> {
            Bitmap shot = null;
            if (image != null) {
                try {
                    shot = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), image),
                            (decoder, info, src) -> decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE));
                } catch (Exception ignored) {}
            }
            final Bitmap fShot = shot;
            runOnUiThread(() -> {
                Tracker.capture(getApplicationContext(), from != null ? from : "Shared", url, body, fShot, null,
                        (ok, msg) -> {
                            Toast.makeText(getApplicationContext(), msg, Toast.LENGTH_LONG).show();
                            if (ok) Tracker.sortNow(getApplicationContext(), (sorted, what) -> {
                                if (sorted) Toast.makeText(getApplicationContext(), what, Toast.LENGTH_LONG).show();
                            });
                        });
                finish();
            });
        }).start();
    }
}
