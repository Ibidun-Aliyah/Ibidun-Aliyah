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
        // From the Quick save widget: use Bisi's floating card when the bubble is running.
        if (getIntent().getBooleanExtra("fromWidget", false) && BubbleService.instance != null
                && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED
                && android.speech.SpeechRecognizer.isRecognitionAvailable(this)) {
            finish();
            BubbleService.instance.voice();
            return;
        }
        // From the bubble: ask for the microphone once, then listen in the floating card from now on.
        if (getIntent().getBooleanExtra("fromBubble", false)
                && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, MIC);
            return;
        }
        listen();
    }

    private static final int MIC = 12;

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req != MIC) return;
        if (res.length > 0 && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED
                && android.speech.SpeechRecognizer.isRecognitionAvailable(this) && BubbleService.instance != null) {
            finish();
            BubbleService.instance.voice();
        } else listen();
    }

    private void listen() {
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
                    VoiceCard.saveOpportunity(app, text);
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

    private void saveNote(String text, long when) { VoiceCard.saveNote(this, text, when); }
}
