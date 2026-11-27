package com.followthrough.bubble;

import android.app.Application;
import android.util.Log;

import java.io.PrintWriter;
import java.io.StringWriter;

/** Saves any crash so the app can show it (and you can send it to Claude) next time it opens. */
public class FtApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try {
                StringWriter sw = new StringWriter();
                e.printStackTrace(new PrintWriter(sw));
                getSharedPreferences("crash", MODE_PRIVATE).edit()
                        .putString("last", "Thread: " + t.getName() + "\n" + sw).commit();
            } catch (Throwable ignored) {}
            Log.e("FollowThrough", "crash", e);
            if (previous != null) previous.uncaughtException(t, e);
        });
    }
}
