package com.followthrough.bubble;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.ImageView;
import android.widget.Toast;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The floating bubble.
 *
 * Tap      → capture what's on screen (text, link, screenshot). Taps within 6 s are slides of one post, sent together.
 * Drag     → move it; it tucks against the nearest edge.
 * Hold     → say what to save (voice note).
 * Drag it to the bottom edge → hide it for an hour (open the app to bring it back sooner).
 *
 * The screen is only read at the moment of a tap.
 */
public class BubbleService extends AccessibilityService {

    static BubbleService instance;

    private static final long HIDE_MS = 60 * 60 * 1000L;
    private static final Pattern URL = Pattern.compile("https?://[^\\s\"'<>)]+", Pattern.CASE_INSENSITIVE);

    private final Handler main = new Handler(Looper.getMainLooper());
    private WindowManager wm;
    private ImageView bubble;
    private WindowManager.LayoutParams lp;
    private boolean busy;
    private int size;

    @Override
    protected void onServiceConnected() {
        instance = this;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        addBubble();
        Tracker.flushQueue(this, null);
        try { Nag.schedule(this); } catch (Throwable e) { android.util.Log.e("FollowThrough", "schedule", e); }
    }

    private Focus focus;

    /** Only the name of the app that's open is used here (for the scroll guard). Screen content is read only on tap. */
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.getPackageName() == null) return;
        if (focus == null) focus = new Focus(this);
        focus.onApp(event.getPackageName().toString());
    }
    @Override public void onInterrupt() {}

    @Override
    public void onDestroy() {
        if (bubble != null && bubble.isAttachedToWindow()) wm.removeView(bubble);
        instance = null;
        super.onDestroy();
    }

    /** Called from the app's "Show bubble" button. */
    void showNow() {
        main.removeCallbacksAndMessages(null);
        if (bubble != null) bubble.setVisibility(View.VISIBLE);
    }

    /* ---------- bubble view ---------- */

    @SuppressLint("ClickableViewAccessibility")
    private void addBubble() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        size = Math.round(58 * dm.density);

        bubble = new ImageView(this);
        bubble.setImageResource(R.drawable.bubble_happy);
        bubble.setScaleType(ImageView.ScaleType.FIT_CENTER);
        int pad = Math.round(4 * dm.density);
        bubble.setPadding(pad, pad, pad, pad);
        bubble.setBackgroundResource(R.drawable.bubble_bg);
        bubble.setAlpha(0.8f);
        bubble.setElevation(8 * dm.density);
        bubble.setContentDescription("Save this opportunity to Follow-Through");

        lp = new WindowManager.LayoutParams(size, size,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = Tracker.prefs(this).getInt("bx", dm.widthPixels - size + size / 5);
        lp.y = Tracker.prefs(this).getInt("by", dm.heightPixels / 3);

        final int slop = ViewConfiguration.get(this).getScaledTouchSlop();
        final long holdMs = ViewConfiguration.getLongPressTimeout() + 250;

        bubble.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY; int startX, startY; long downAt; boolean dragging;

            @Override public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX(); downY = e.getRawY();
                        startX = lp.x; startY = lp.y; downAt = e.getEventTime(); dragging = false;
                        bubble.setAlpha(1f);
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX, dy = e.getRawY() - downY;
                        if (!dragging && Math.hypot(dx, dy) > slop) dragging = true;
                        if (dragging) {
                            lp.x = startX + Math.round(dx);
                            lp.y = startY + Math.round(dy);
                            wm.updateViewLayout(bubble, lp);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        bubble.setAlpha(0.8f);
                        if (dragging) {
                            DisplayMetrics m = getResources().getDisplayMetrics();
                            if (lp.y > m.heightPixels - size * 1.8) { lp.x = startX; lp.y = startY; wm.updateViewLayout(bubble, lp); hideForAWhile(); }
                            else snapToEdge();
                        }
                        else if (e.getEventTime() - downAt > holdMs) voice();
                        else capture();
                        return true;
                    case MotionEvent.ACTION_CANCEL:
                        bubble.setAlpha(0.8f);
                        return true;
                }
                return false;
            }
        });
        wm.addView(bubble, lp);
    }

    private void snapToEdge() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        lp.x = (lp.x + size / 2 < dm.widthPixels / 2) ? -size / 5 : dm.widthPixels - size + size / 5;
        lp.y = Math.max(0, Math.min(lp.y, dm.heightPixels - size));
        wm.updateViewLayout(bubble, lp);
        Tracker.prefs(this).edit().putInt("bx", lp.x).putInt("by", lp.y).apply();
    }

    private VoiceCard voiceCard;

    /** Listen right here, over whatever app is open. Needs the microphone permission once. */
    void voice() {
        boolean mic = checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        if (mic && android.speech.SpeechRecognizer.isRecognitionAvailable(this)) {
            if (voiceCard == null) voiceCard = new VoiceCard(this, wm);
            voiceCard.start();
            return;
        }
        // First time (asks for the microphone), or no on-device speech service: the small voice popup.
        Intent i = new Intent(this, VoiceActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra("fromBubble", true);
        try { startActivity(i); } catch (Exception e) { Toast.makeText(this, "Couldn't start voice.", Toast.LENGTH_SHORT).show(); }
    }

    private void hideForAWhile() {
        bubble.setVisibility(View.GONE);
        Toast.makeText(this, "Bubble hidden for an hour. Open Follow-Through to bring it back.", Toast.LENGTH_SHORT).show();
        main.postDelayed(() -> bubble.setVisibility(View.VISIBLE), HIDE_MS);
    }

    /** Bisi reacts: party face when saved, worried face while saving or if it failed. */
    private void flash(boolean ok) {
        bubble.setImageResource(ok ? R.drawable.bubble_party : R.drawable.bubble_worried);
        bubble.setBackgroundResource(ok ? R.drawable.bubble_bg_ok : R.drawable.bubble_bg);
        bubble.animate().scaleX(1.2f).scaleY(1.2f).setDuration(140).withEndAction(() -> bubble.animate().scaleX(1f).scaleY(1f).setDuration(160).start()).start();
        main.postDelayed(() -> {
            bubble.setImageResource(R.drawable.bubble_happy);
            bubble.setBackgroundResource(R.drawable.bubble_bg);
        }, 1800);
    }

    /* ---------- capture ---------- */

    private void capture() {
        if (busy) return;
        busy = true;
        bubble.setVisibility(View.INVISIBLE);        // keep the bubble out of the screenshot
        main.postDelayed(() -> readScreen(null, null), 150);
    }

    /**
     * Called after "Share → Save to Follow-Through": apps like Instagram only share a link,
     * so once the share sheet has closed, capture the post that's back on screen as well.
     */
    void captureAfterShare(String sharedText, String sharedUrl) {
        main.postDelayed(() -> {
            if (busy) return;
            busy = true;
            if (bubble != null) bubble.setVisibility(View.INVISIBLE);
            main.postDelayed(() -> readScreen(sharedText, sharedUrl), 150);
        }, 900);
    }

    private void readScreen(String sharedText, String sharedUrl) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        String pkg = root != null && root.getPackageName() != null ? root.getPackageName().toString() : "";
        Set<String> lines = new LinkedHashSet<>();
        String[] link = {null};
        if (root != null) walk(root, lines, link, 0);

        StringBuilder text = new StringBuilder();
        for (String l : lines) {
            if (text.length() > 20000) break;
            text.append(l).append('\n');
        }
        String url = sharedUrl != null ? sharedUrl : link[0];
        if (sharedText != null && !sharedText.isEmpty()) text.insert(0, "Shared: " + sharedText + "\n\n");
        if (url == null) {
            Matcher m = URL.matcher(text);
            if (m.find()) url = m.group();
        }
        if (url != null && !url.startsWith("http")) url = "https://" + url;

        final String fApp = appName(pkg), fUrl = url, fText = text.toString();
        takeScreenshot(Display.DEFAULT_DISPLAY, getMainExecutor(), new TakeScreenshotCallback() {
            @Override public void onSuccess(ScreenshotResult r) {
                Bitmap shot = null;
                try {
                    Bitmap hw = Bitmap.wrapHardwareBuffer(r.getHardwareBuffer(), r.getColorSpace());
                    if (hw != null) shot = hw.copy(Bitmap.Config.ARGB_8888, false);
                } catch (Exception ignored) {
                } finally {
                    r.getHardwareBuffer().close();
                }
                send(fApp, fUrl, fText, shot);
            }
            @Override public void onFailure(int errorCode) {
                send(fApp, fUrl, fText, null);
            }
        });
    }

    /* Carousels: taps within a few seconds of each other are slides of ONE post, sent together. */
    private static final long SLIDE_WAIT = 6000;
    private static final int MAX_SLIDES = 8;
    private final java.util.List<Bitmap> slides = new java.util.ArrayList<>();
    private int slideCount;
    private String slApp, slUrl;
    private StringBuilder slText;
    private Toast slideToast;
    private final Runnable flushSlides = this::flushSlides;

    private void send(String app, String url, String text, Bitmap shot) {
        bubble.setVisibility(View.VISIBLE);
        busy = false;
        if (slideCount == 0) { slApp = app; slUrl = url; slText = new StringBuilder(text == null ? "" : text); }
        else {
            if (slUrl == null) slUrl = url;
            if (text != null && !text.isEmpty() && slText.indexOf(text) < 0 && slText.length() < 30000) slText.append("\n--- next slide ---\n").append(text);
        }
        slideCount++;
        if (shot != null && slides.size() < MAX_SLIDES) {
            int w = shot.getWidth(), h = shot.getHeight();
            slides.add(w > 760 ? Bitmap.createScaledBitmap(shot, 760, Math.max(1, h * 760 / w), true) : shot);
        }
        flash(true);
        if (slideToast != null) slideToast.cancel();
        slideToast = Toast.makeText(this, slideCount == 1 ? "Got it! 🐝 More slides of this post? Tap again" : "Slide " + slideCount + " added. Tap again, or wait and I’ll send them together", Toast.LENGTH_SHORT);
        slideToast.show();
        main.removeCallbacks(flushSlides);
        main.postDelayed(flushSlides, slideCount >= MAX_SLIDES ? 300 : SLIDE_WAIT);
    }

    private void flushSlides() {
        if (slideCount == 0) return;
        java.util.List<Bitmap> parts = new java.util.ArrayList<>(slides);
        int n = slideCount;
        String app = slApp, url = slUrl, text = slText.toString();
        slides.clear(); slideCount = 0; slText = null;
        Bitmap shot = parts.isEmpty() ? null : parts.size() == 1 ? parts.get(0) : Tracker.combine(parts);
        if (parts.size() > 1) text = "ONE POST: these " + parts.size() + " numbered screenshots are slides of the same post (e.g. a carousel). Read them together, in order, as a single opportunity.\n\n" + text;
        upload(app, url, text, shot, n);
    }

    private void upload(String app, String url, String text, Bitmap shot, int n) {
        flash(false);
        Tracker.capture(this, app, url, text, shot, null, (ok, msg) -> {
            flash(ok);
            Toast.makeText(this, ok && n > 1 ? "Saved " + n + " slides as one post 🐝" : msg, Toast.LENGTH_SHORT).show();
            if (ok) Tracker.sortNow(this, (sorted, what) -> {
                if (sorted) Toast.makeText(this, what, Toast.LENGTH_LONG).show();
            });
        });
    }

    /** Collects visible text, skipping password fields, and spots a browser's address bar. */
    private void walk(AccessibilityNodeInfo n, Set<String> out, String[] link, int depth) {
        if (n == null || depth > 60) return;
        if (n.isPassword()) return;
        String id = n.getViewIdResourceName();
        CharSequence t = n.getText();
        if (t != null && id != null && link[0] == null) {
            String lid = id.toLowerCase(Locale.ROOT);
            if (lid.contains("url_bar") || lid.contains("url_field") || lid.contains("location_bar")
                    || lid.contains("mozac_browser_toolbar_url_view") || lid.contains("address")) {
                String s = t.toString().trim();
                if (s.contains(".") && !s.contains(" ")) link[0] = s;
            }
        }
        if (n.isVisibleToUser()) {
            if (t != null && t.toString().trim().length() > 1) out.add(t.toString().trim());
            else if (n.getContentDescription() != null && n.getContentDescription().length() > 20)
                out.add(n.getContentDescription().toString().trim());
        }
        for (int i = 0; i < n.getChildCount(); i++) walk(n.getChild(i), out, link, depth + 1);
    }

    private static String appName(String pkg) {
        if (pkg.contains("instagram")) return "Instagram";
        if (pkg.contains("twitter") || pkg.equals("com.x.android")) return "X (Twitter)";
        if (pkg.contains("linkedin")) return "LinkedIn";
        if (pkg.contains("whatsapp")) return "WhatsApp";
        if (pkg.contains("telegram")) return "Telegram";
        if (pkg.contains("facebook")) return "Facebook";
        if (pkg.contains("tiktok") || pkg.contains("musically")) return "TikTok";
        if (pkg.contains("youtube")) return "YouTube";
        if (pkg.contains("android.gm")) return "Gmail";
        if (pkg.contains("chrome") || pkg.contains("firefox") || pkg.contains("opera")
                || pkg.contains("sbrowser") || pkg.contains("browser") || pkg.contains("brave"))
            return "Browser";
        return pkg.isEmpty() ? "Unknown" : pkg;
    }
}
