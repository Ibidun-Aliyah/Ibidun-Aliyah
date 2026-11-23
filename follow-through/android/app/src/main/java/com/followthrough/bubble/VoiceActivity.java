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
            if (!text.trim().isEmpty()) {
                Toast.makeText(this, "“" + text + "”: saving…", Toast.LENGTH_SHORT).show();
                final android.content.Context app = getApplicationContext();
                Tracker.capture(app, "Voice note", null, "Spoken note: " + text, null, text, (ok, msg) -> {
                    Toast.makeText(app, msg, Toast.LENGTH_SHORT).show();
                    if (ok) Tracker.sortNow(app, (sorted, what) -> { if (sorted) Toast.makeText(app, what, Toast.LENGTH_LONG).show(); });
                });
            }
        }
        finish();
    }
}
