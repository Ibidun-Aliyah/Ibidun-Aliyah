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
        Uri image = in.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);

        String body = ((subject != null ? subject + "\n" : "") + (text != null ? text : "")).trim();
        String url = null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("https?://\\S+").matcher(body);
        if (m.find()) url = m.group();

        Bitmap shot = null;
        if (image != null) {
            try {
                shot = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), image),
                        (decoder, info, src) -> decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE));
            } catch (Exception ignored) {}
        }
        // Link-only share (Instagram, X, LinkedIn…): let the bubble screenshot the post once we close.
        if (shot == null && BubbleService.instance != null) {
            BubbleService.instance.captureAfterShare(body, url);
            Toast.makeText(this, "Saving with a screenshot…", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        String from = getReferrer() != null ? getReferrer().getHost() : null;
        Toast.makeText(this, "Saving…", Toast.LENGTH_SHORT).show();
        Tracker.capture(this, from != null ? from : "Shared", url, body, shot, null,
                (ok, msg) -> Toast.makeText(getApplicationContext(), msg, Toast.LENGTH_LONG).show());
        finish();
    }
}
