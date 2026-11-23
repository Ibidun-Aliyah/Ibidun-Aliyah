package com.followthrough.bubble;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.widget.Toast;

import java.util.ArrayList;

/** "Hold the bubble and talk": turns what you say into a capture for Bisi to sort. */
public class VoiceActivity extends Activity {
    private static final int SPEAK = 11;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PROMPT, "Tell Bisi what to save");
        try {
            startActivityForResult(i, SPEAK);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Voice typing isn't available on this phone. Install or enable Google voice typing.", Toast.LENGTH_LONG).show();
            finish();
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == SPEAK && res == RESULT_OK && data != null) {
            ArrayList<String> said = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            String text = said != null && !said.isEmpty() ? said.get(0) : "";
            if (!text.trim().isEmpty()) { choose(text); return; }
        }
        finish();
    }

    /** Ask what this is: a reminder (if a time was said), a note, or an opportunity for the tracker. */
    private void choose(String text) {
        final long when = Notes.parseWhen(text);
        final android.content.Context app = getApplicationContext();
        String whenLabel = when == 0 ? "" : new java.text.SimpleDateFormat("EEE d MMM, h:mm a", java.util.Locale.getDefault()).format(new java.util.Date(when));
        android.app.AlertDialog.Builder b = new android.app.AlertDialog.Builder(this)
                .setTitle("🐝 Save this as…")
                .setMessage("“" + text + "”" + (when == 0 ? "" : "\n\n⏰ " + whenLabel))
                .setNeutralButton("Opportunity", (d, w) -> {
                    Tracker.capture(app, "Voice note", null, "Spoken note: " + text, null, text, (ok, msg) -> {
                        Toast.makeText(app, msg, Toast.LENGTH_SHORT).show();
                        if (ok) Tracker.sortNow(app, (sorted, what) -> { if (sorted) Toast.makeText(app, what, Toast.LENGTH_LONG).show(); });
                    });
                    finish();
                })
                .setOnCancelListener(d -> finish());
        if (when != 0) {
            b.setPositiveButton("Reminder", (d, w) -> { saveNote(text, when); Toast.makeText(app, "I'll remind you " + whenLabel + ". Count on it. 🐝", Toast.LENGTH_LONG).show(); finish(); });
            b.setNegativeButton("Note", (d, w) -> { saveNote(text, 0); Toast.makeText(app, "Saved to your notes. 📝", Toast.LENGTH_SHORT).show(); finish(); });
        } else {
            b.setPositiveButton("Note", (d, w) -> { saveNote(text, 0); Toast.makeText(app, "Saved to your notes. 📝", Toast.LENGTH_SHORT).show(); finish(); });
            b.setNegativeButton("Cancel", (d, w) -> finish());
        }
        b.show();
    }

    private void saveNote(String text, long when) {
        try {
            org.json.JSONObject n = new org.json.JSONObject()
                    .put("text", text.substring(0, 1).toUpperCase() + text.substring(1))
                    .put("items", new org.json.JSONArray()).put("color", when != 0 ? "honey" : "mint")
                    .put("pinned", false).put("remindAt", when).put("done", false).put("voice", true);
            Notes.save(getApplicationContext(), n);
            Nag.markActive(getApplicationContext());
        } catch (Exception ignored) {}
    }
}
