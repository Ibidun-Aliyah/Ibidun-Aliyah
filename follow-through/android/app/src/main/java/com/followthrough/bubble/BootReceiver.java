package com.followthrough.bubble;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restart the hourly check after the phone reboots. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) { try { Nag.schedule(c); } catch (Throwable ignored) {} }
    }
}
