package com.followthrough.bubble;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

/**
 * Hold the bubble and talk, without leaving the app you're in: a small Bisi card floats at the
 * bottom of the screen, listens, then asks whether it's a reminder, a note or an opportunity.
 */
final class VoiceCard {
    private final Context ctx;
    private final WindowManager wm;
    private LinearLayout card;
    private TextView title, body;
    private ImageView face;
    private LinearLayout buttons;
    private SpeechRecognizer sr;

    VoiceCard(Context ctx, WindowManager wm) { this.ctx = ctx; this.wm = wm; }

    boolean showing() { return card != null; }

    void start() {
        if (card != null) { close(); return; }
        build();
        setState(R.drawable.bisi_happy, "Listening… 🎤", "Say it like “Call mum at 6pm” or “Scholarship deadline Friday”.");
        addButton("Cancel", false, this::close);
        sr = SpeechRecognizer.createSpeechRecognizer(ctx);
        sr.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle b) {}
            @Override public void onBeginningOfSpeech() { if (title != null) title.setText("I'm listening… 🐝"); }
            @Override public void onRmsChanged(float v) { if (face != null) { float s = 1f + Math.max(0, Math.min(v, 10)) / 60f; face.setScaleX(s); face.setScaleY(s); } }
            @Override public void onBufferReceived(byte[] b) {}
            @Override public void onEndOfSpeech() { if (title != null) title.setText("Thinking…"); }
            @Override public void onError(int error) {
                if (card == null) return;
                String why = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                        ? "I didn't catch that. Did you say something, or were you just buzzing?"
                        : error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT
                        ? "Voice needs internet. Try again when you're connected."
                        : "Voice didn't work (error " + error + "). Try again.";
                setState(R.drawable.bisi_worried, "Hmm.", why);
                clearButtons();
                addButton("Try again", true, () -> { close(); start(); });
                addButton("Close", false, VoiceCard.this::close);
            }
            @Override public void onResults(Bundle b) {
                ArrayList<String> said = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = said != null && !said.isEmpty() ? said.get(0).trim() : "";
                if (text.isEmpty()) { onError(SpeechRecognizer.ERROR_NO_MATCH); return; }
                choose(text);
            }
            @Override public void onPartialResults(Bundle b) {
                ArrayList<String> said = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (said != null && !said.isEmpty() && body != null && !said.get(0).isEmpty()) body.setText("“" + said.get(0) + "”");
            }
            @Override public void onEvent(int t, Bundle b) {}
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.getPackageName());
        try { sr.startListening(i); } catch (Exception e) { close(); Toast.makeText(ctx, "Couldn't start voice.", Toast.LENGTH_SHORT).show(); }
    }

    private void choose(String text) {
        final long when = Notes.parseWhen(text);
        final String label = when == 0 ? "" : new SimpleDateFormat("EEE d MMM, h:mm a", Locale.getDefault()).format(new Date(when));
        face.setScaleX(1f); face.setScaleY(1f);
        setState(R.drawable.bisi_party, "Save this as…", "“" + text + "”" + (when == 0 ? "" : "\n⏰ " + label));
        clearButtons();
        if (when != 0) addButton("⏰ Reminder", true, () -> saved(saveNote(ctx, text, when), "I'll remind you " + label + ". Count on it."));
        addButton("📝 Note", when == 0, () -> saved(saveNote(ctx, text, 0), "Saved to your notes."));
        addButton("🎯 Opportunity", false, () -> { saveOpportunity(ctx, text); close(); });
        addButton("✕", false, this::close);
    }

    /** Saved: show Undo / Edit for a few seconds in case Bisi misheard. */
    private void saved(String id, String msg) {
        if (id == null) { close(); Toast.makeText(ctx, "Couldn't save that.", Toast.LENGTH_SHORT).show(); return; }
        setState(R.drawable.bisi_happy, "Saved ✓ 🐝", msg);
        clearButtons();
        addButton("Undo", false, () -> { Notes.delete(ctx, id); close(); Toast.makeText(ctx, "Gone. Like it never happened. 🐝", Toast.LENGTH_SHORT).show(); });
        addButton("✎ Edit", true, () -> { close(); openInApp(id); });
        addButton("OK", false, this::close);
        final LinearLayout mine = card;
        card.postDelayed(() -> { if (card == mine) close(); }, 7000);
    }

    private void openInApp(String id) {
        Intent i = new Intent(ctx, MainActivity.class).putExtra("openNote", id)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try { ctx.startActivity(i); } catch (Exception ignored) {}
    }

    void close() {
        if (sr != null) { try { sr.cancel(); sr.destroy(); } catch (Exception ignored) {} sr = null; }
        if (card != null) { try { wm.removeView(card); } catch (Exception ignored) {} card = null; }
    }

    /* ---------- saving (shared with VoiceActivity) ---------- */

    static String saveNote(Context c, String text, long when) {
        try {
            JSONObject n = new JSONObject()
                    .put("text", text.substring(0, 1).toUpperCase(Locale.getDefault()) + text.substring(1))
                    .put("items", new JSONArray()).put("color", when != 0 ? "honey" : "mint")
                    .put("pinned", false).put("remindAt", when).put("done", false).put("voice", true);
            JSONObject out = Notes.save(c.getApplicationContext(), n);
            Nag.markActive(c.getApplicationContext());
            return out == null ? null : out.optString("id", null);
        } catch (Exception e) { return null; }
    }

    static void saveOpportunity(Context c, String text) {
        final Context app = c.getApplicationContext();
        Tracker.capture(app, "Voice note", null, "Spoken note: " + text, null, text, (ok, msg) -> {
            Toast.makeText(app, msg, Toast.LENGTH_SHORT).show();
            if (ok) Tracker.sortNow(app, (sorted, what) -> { if (sorted) Toast.makeText(app, what, Toast.LENGTH_LONG).show(); });
        });
    }

    /* ---------- the card ---------- */

    private int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics())); }

    private void build() {
        card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(14), dp(16), dp(12));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#FFFDF4")); bg.setCornerRadius(dp(22)); bg.setStroke(dp(2.5f), Color.parseColor("#1E1606"));
        card.setBackground(bg);
        card.setElevation(dp(10));

        LinearLayout top = new LinearLayout(ctx);
        top.setGravity(Gravity.CENTER_VERTICAL);
        face = new ImageView(ctx);
        top.addView(face, new LinearLayout.LayoutParams(dp(52), dp(52)));
        LinearLayout txt = new LinearLayout(ctx);
        txt.setOrientation(LinearLayout.VERTICAL);
        txt.setPadding(dp(12), 0, 0, 0);
        title = new TextView(ctx);
        title.setTextColor(Color.parseColor("#1E1606")); title.setTextSize(18); title.setTypeface(Typeface.DEFAULT_BOLD);
        body = new TextView(ctx);
        body.setTextColor(Color.parseColor("#5A4520")); body.setTextSize(14); body.setMaxLines(5);
        txt.addView(title); txt.addView(body);
        top.addView(txt, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        card.addView(top);

        buttons = new LinearLayout(ctx);
        buttons.setGravity(Gravity.END);
        buttons.setPadding(0, dp(12), 0, 0);
        card.addView(buttons, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                ctx.getResources().getDisplayMetrics().widthPixels - dp(24), WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(28);
        lp.windowAnimations = android.R.style.Animation_Toast;
        wm.addView(card, lp);
    }

    private void setState(int faceRes, String t, String b) { face.setImageResource(faceRes); title.setText(t); body.setText(b); }

    private void clearButtons() { buttons.removeAllViews(); }

    private void addButton(String label, boolean primary, Runnable r) {
        TextView b = new TextView(ctx);
        b.setText(label); b.setTextSize(14); b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(Color.parseColor(primary ? "#FFD23F" : "#1E1606"));
        b.setPadding(dp(12), dp(8), dp(12), dp(8));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor(primary ? "#1E1606" : "#FFF3CC")); bg.setCornerRadius(dp(14)); bg.setStroke(dp(2), Color.parseColor("#1E1606"));
        b.setBackground(bg);
        b.setOnClickListener(v -> r.run());
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        p.setMarginStart(dp(6));
        buttons.addView(b, p);
    }
}
