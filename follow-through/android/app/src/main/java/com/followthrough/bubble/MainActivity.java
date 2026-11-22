package com.followthrough.bubble;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

/** Setup screen: connect the sheet, turn on the bubble, see what's waiting to send. */
public class MainActivity extends Activity {
    private EditText code;
    private TextView connStatus, bubbleStatus, queue;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        setContentView(R.layout.activity_main);
        code = findViewById(R.id.code);
        connStatus = findViewById(R.id.connStatus);
        bubbleStatus = findViewById(R.id.bubbleStatus);
        queue = findViewById(R.id.queue);

        code.setText(Tracker.prefs(this).getString("code", ""));

        ((Button) findViewById(R.id.connect)).setOnClickListener(v -> {
            String c = code.getText().toString().trim();
            Tracker.prefs(this).edit().putString("code", c).apply();
            connStatus.setText("Testing…");
            Tracker.ping(this, (ok, msg) -> {
                connStatus.setText((ok ? "✓ " : "✕ ") + msg);
                connStatus.setTextColor(getColor(ok ? R.color.ok : R.color.bad));
                if (ok) Tracker.flushQueue(this, (o, m) -> refresh());
                refresh();
            });
        });
        findViewById(R.id.accessibility).setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        findViewById(R.id.appInfo).setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.fromParts("package", getPackageName(), null))));
        findViewById(R.id.show).setOnClickListener(v -> {
            if (BubbleService.instance != null) BubbleService.instance.showNow();
            refresh();
        });
        findViewById(R.id.openSheet).setOnClickListener(v -> {
            String u = Tracker.prefs(this).getString("sheetUrl", "");
            if (!u.isEmpty()) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u)));
        });
        findViewById(R.id.flush).setOnClickListener(v -> {
            queue.setText("Sending…");
            Tracker.flushQueue(this, (ok, msg) -> { refresh(); queue.setText(msg); });
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
    }

    private void refresh() {
        boolean on = bubbleEnabled();
        bubbleStatus.setText(on ? "✓ Bubble is on" : "Bubble is off. Tap “Open settings”, find Follow-Through bubble under Downloaded apps and switch it on.");
        bubbleStatus.setTextColor(getColor(on ? R.color.ok : R.color.bad));
        findViewById(R.id.show).setEnabled(on);
        findViewById(R.id.openSheet).setVisibility(
                Tracker.prefs(this).getString("sheetUrl", "").isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        int n = Tracker.queued(this);
        queue.setText(n == 0 ? "Nothing waiting to send." : n + (n == 1 ? " capture is" : " captures are") + " waiting to send.");
        findViewById(R.id.flush).setEnabled(n > 0);
    }

    private boolean bubbleEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        String me = new ComponentName(this, BubbleService.class).flattenToString();
        return enabled != null && enabled.contains(me);
    }
}
