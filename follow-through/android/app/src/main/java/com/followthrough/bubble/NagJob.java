package com.followthrough.bubble;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Runs about once an hour: refresh from the sheet, update the widget, nag if needed. */
public class NagJob extends JobService {
    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            Nag.refresh(getApplicationContext(), true);
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return true; }
}
