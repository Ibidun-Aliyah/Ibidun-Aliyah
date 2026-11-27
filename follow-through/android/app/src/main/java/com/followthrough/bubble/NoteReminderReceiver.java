package com.followthrough.bubble;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

import org.json.JSONObject;

/** Fires note reminders, and handles their Done / Snooze buttons. */
public class NoteReminderReceiver extends BroadcastReceiver {
    static final String FIRE = "com.followthrough.NOTE_FIRE";
    static final String DONE = "com.followthrough.NOTE_DONE";
    static final String SNOOZE10 = "com.followthrough.NOTE_SNOOZE10";
    static final String SNOOZE60 = "com.followthrough.NOTE_SNOOZE60";

    @Override
    public void onReceive(Context c, Intent i) {
        String id = i.getStringExtra("id");
        JSONObject n = id == null ? null : Notes.get(c, id);
        if (n == null) return;
        String act = i.getAction();
        if (FIRE.equals(act)) { Notes.notifyReminder(c, n); return; }
        c.getSystemService(NotificationManager.class).cancel(i.getIntExtra("nid", 0));
        try {
            if (DONE.equals(act)) {
                n.put("done", true); n.put("remindAt", 0);
                Notes.save(c, n); Nag.markActive(c);
                Toast.makeText(c, "Done! Bisi is proud. 🐝", Toast.LENGTH_SHORT).show();
            } else {
                long mins = SNOOZE10.equals(act) ? 10 : 60;
                n.put("remindAt", System.currentTimeMillis() + mins * 60_000L);
                Notes.save(c, n);
                Toast.makeText(c, "Fine. " + mins + " more minutes. I'm counting.", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception ignored) {}
    }
}
