package com.apptracker

import android.app.NotificationManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Alarm-clock style screen for critical alerts (acceptances, deadlines). Shows over the lock screen. */
class AlertActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val id = intent.getStringExtra("alert")
        val state = Prefs(this).state()
        val alert = state.alerts.firstOrNull { it.id == id }
        if (alert == null) { finish(); return }
        val caseName = state.case(alert.caseId)?.name.orEmpty()

        setContent {
            AppTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.errorContainer) {
                    Column(
                        Modifier.safeDrawingPadding().padding(28.dp).verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Spacer(Modifier.height(40.dp))
                        Text("🚨", fontSize = 56.sp)
                        Text(alert.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        if (caseName.isNotBlank()) Text(caseName, style = MaterialTheme.typography.titleMedium)
                        Text(alert.body, style = MaterialTheme.typography.bodyLarge)
                        Spacer(Modifier.height(16.dp))
                        if (alert.link.isNotBlank()) {
                            Button(onClick = { openLink(this@AlertActivity, alert.link) }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                                Text("📧 Open the email", fontSize = 17.sp)
                            }
                        }
                        OutlinedButton(onClick = {
                            getSystemService(NotificationManager::class.java).cancel(Notifier.nid(alert.id))
                            Sync.sendAction(this@AlertActivity, "ack", alert.id)
                            finish()
                        }, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text("✅ I've handled it", fontSize = 17.sp) }
                        TextButton(onClick = { finish() }, modifier = Modifier.fillMaxWidth()) {
                            Text("Remind me later", textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
    }
}
