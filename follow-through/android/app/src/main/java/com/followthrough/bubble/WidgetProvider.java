package com.followthrough.bubble;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** The home-screen widget. Its look comes from Nag.widgetViews(). */
public class WidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        m.updateAppWidget(ids, Nag.widgetViews(c));
        Nag.schedule(c);
        Nag.refreshAsync(c);
    }

    @Override
    public void onEnabled(Context c) { Nag.schedule(c); }
}
