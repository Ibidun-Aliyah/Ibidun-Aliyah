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
    @SuppressWarnings("deprecation")
    private static java.util.ArrayList<Uri> legacyList(Intent in) { return in.getParcelableArrayListExtra(Intent.EXTRA_STREAM); }

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

        // Several images shared together (a carousel, a multi-page flyer): one post, read together.
        java.util.ArrayList<Uri> many = null;
        if (Intent.ACTION_SEND_MULTIPLE.equals(in.getAction())) {
            many = android.os.Build.VERSION.SDK_INT >= 33
                    ? in.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class)
                    : legacyList(in);
        }
        final String body0 = ((subject != null ? subject + "\n" : "") + (text != null ? text : "")).trim();
        final java.util.ArrayList<Uri> fMany = many;
        final String body = fMany != null && fMany.size() > 1
                ? ("ONE POST: these " + Math.min(fMany.size(), 8) + " numbered images are slides/pages of the same post. Read them together, in order, as a single opportunity.\n" + body0).trim()
                : body0;
        String found = null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("https?://\\S+").matcher(body);
        if (m.find()) found = m.group();
        final String url = found;
        final String from = getReferrer() != null ? getReferrer().getHost() : null;

        // Link-only share (Instagram, X, LinkedIn…): let the bubble screenshot the post once we close.
        if (image == null && fMany == null && BubbleService.instance != null) {
            BubbleService.instance.captureAfterShare(body, url);
            Toast.makeText(this, "Saving with a screenshot…", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        Toast.makeText(this, "Saving…", Toast.LENGTH_SHORT).show();
        // Decode a shared image off the main thread, while we still have permission to read it.
        new Thread(() -> {
            Bitmap shot = null;
            if (fMany != null && !fMany.isEmpty()) {
                java.util.List<Bitmap> parts = new java.util.ArrayList<>();
                for (Uri u : fMany.subList(0, Math.min(fMany.size(), 8))) {
                    try {
                        parts.add(ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), u), (decoder, info, src) -> {
                            decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                            int w = info.getSize().getWidth(), h = info.getSize().getHeight();
                            if (w > 760) decoder.setTargetSize(760, Math.max(1, h * 760 / w));
                        }));
                    } catch (Exception ignored) {}
                }
                shot = parts.size() == 1 ? parts.get(0) : parts.isEmpty() ? null : Tracker.combine(parts);
            } else if (image != null) {
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
