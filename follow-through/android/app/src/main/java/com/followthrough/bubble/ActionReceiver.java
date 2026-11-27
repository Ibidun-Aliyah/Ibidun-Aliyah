package com.followthrough.bubble;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/** Buttons on nag notifications: "Tomorrow", "I applied ✓", "No news yet". */
public class ActionReceiver extends BroadcastReceiver {
    static final String SNOOZE = "com.followthrough.SNOOZE";
    static final String SUBMITTED = "com.followthrough.SUBMITTED";
    static final String HEARD_NOTHING = "com.followthrough.HEARD_NOTHING";

    private static String inDays(int n) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_YEAR, n);
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.getTime());
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        final Context c = context.getApplicationContext();
        final String id = intent.getStringExtra("id");
        final int nid = intent.getIntExtra("nid", 0);
        final String act = intent.getAction();
        c.getSystemService(NotificationManager.class).cancel(nid);
        final PendingResult pr = goAsync();
        new Thread(() -> {
            String msg;
            try {
                JSONObject fields = new JSONObject();
                if (SUBMITTED.equals(act)) {
                    fields.put("Status", "Submitted").put("Remind on", inDays(14)).put("Applied on", Nag.today());
                    msg = "Nice! 🎉 Marked as applied. I'll check in about the result in 2 weeks.";
                } else if (HEARD_NOTHING.equals(act)) {
                    fields.put("Remind on", inDays(7));
                    msg = "Okay. I'll ask again next week.";
                } else {
                    fields.put("Remind on", inDays(1));
                    msg = "Fine. Tomorrow. I'm writing that down. 📝";
                }
                JSONObject req = new JSONObject().put("action", "update").put("id", id).put("fields", fields);
                JSONObject res = new JSONObject(Tracker.callBlocking(c, req.toString(), 30000));
                if (!res.optBoolean("ok")) msg = "Couldn't reach your sheet. Try again from the app.";
                else Nag.markActive(c);
            } catch (Exception e) { msg = "Couldn't reach your sheet. Try again from the app."; }
            Nag.refresh(c, false);
            final String fMsg = msg;
            new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(c, fMsg, Toast.LENGTH_LONG).show());
            pr.finish();
        }).start();
    }
}
