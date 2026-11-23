package com.apptracker

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val shared = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        handleShare(intent)
        setContent { AppTheme { MainScreen(shared.value) { shared.value = null } } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShare(intent)
    }

    private fun handleShare(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND) {
            val text = listOfNotNull(
                intent.getStringExtra(Intent.EXTRA_SUBJECT),
                intent.getStringExtra(Intent.EXTRA_TEXT),
            ).joinToString("\n")
            if (text.isNotBlank()) shared.value = text
        }
    }
}

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val ctx = LocalContext.current
    val scheme = when {
        Build.VERSION.SDK_INT >= 31 -> if (dark) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        dark -> darkColorScheme(primary = Color(0xFF8BD5B4))
        else -> lightColorScheme(primary = Color(0xFF1B6B4F))
    }
    MaterialTheme(colorScheme = scheme, content = content)
}

private val Urgent = Color(0xFFB3261E)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(sharedText: String?, onShareConsumed: () -> Unit) {
    val ctx = LocalContext.current
    val prefs = remember { Prefs(ctx) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var state by remember { mutableStateOf(prefs.state()) }
    var syncing by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(!prefs.configured) }
    var addText by remember { mutableStateOf<String?>(null) }
    var showClosed by remember { mutableStateOf(false) }
    var tick by remember { mutableStateOf(0) }

    fun reload() { state = prefs.state(); tick++ }
    fun sync() {
        if (!prefs.configured) { showSettings = true; return }
        syncing = true
        scope.launch {
            val err = Sync.run(ctx)
            reload()
            syncing = false
            if (err != null) snackbar.showSnackbar("Couldn't refresh: $err")
        }
    }
    fun act(action: String, id: String) {
        Sync.sendAction(ctx, action, id)
        reload()
    }
    fun caseAction(action: String, id: String, msg: String) {
        scope.launch {
            val err = withContext(Dispatchers.IO) { runCatching { Api.post(prefs, action, mapOf("id" to id)) }.exceptionOrNull() }
            if (err == null) { snackbar.showSnackbar(msg); sync() } else snackbar.showSnackbar("Failed: ${err.message}")
        }
    }

    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { sync() }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 && !Notifier.canNotify(ctx)) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else sync()
    }
    LaunchedEffect(sharedText) {
        if (sharedText != null) { addText = sharedText; onShareConsumed() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AppTracker", fontWeight = FontWeight.Bold) },
                actions = {
                    if (syncing) CircularProgressIndicator(Modifier.size(22.dp).padding(end = 4.dp), strokeWidth = 2.dp)
                    else IconButton(onClick = { sync() }) { Icon(Icons.Filled.Refresh, "Refresh") }
                    IconButton(onClick = { showSettings = true }) { Icon(Icons.Filled.Settings, "Settings") }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { addText = "" },
                icon = { Icon(Icons.Filled.Add, null) },
                text = { Text("Log application") },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { pad ->
        val alerts = state.openAlerts
        val actions = state.openActions
        val open = state.cases.filter { it.isOpen }.sortedBy { it.windowEnd.ifBlank { "9999" } }
        val closed = state.cases.filter { !it.isOpen }
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item(key = "status$tick") {
                Text(
                    "Updated ${Time.ago(prefs.lastSync)}" + if (prefs.lastError.isNotBlank()) " · ⚠️ ${prefs.lastError}" else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (alerts.isEmpty() && actions.isEmpty() && open.isEmpty()) {
                item {
                    EmptyCard(prefs.configured)
                }
            }
            if (alerts.isNotEmpty()) {
                item { Section("Needs your attention") }
                items(alerts, key = { "al" + it.id }) { a ->
                    AlertCard(a, state.case(a.caseId)?.name.orEmpty(), onHandled = { act("ack", a.id) }, onOpen = { openLink(ctx, a.link) })
                }
            }
            if (actions.isNotEmpty()) {
                item { Section("To do") }
                items(actions, key = { "ac" + it.id }) { a ->
                    ActionCard(a, state, onDone = { act("action_done", a.id) }, onOpen = { openLink(ctx, a.link) })
                }
            }
            if (open.isNotEmpty()) {
                item { Section("Tracking (${open.size})") }
                items(open, key = { "c" + it.id }) { c ->
                    CaseCard(c, state, onOpen = { openLink(ctx, c.lastLink.ifBlank { c.sourceUrl }) },
                        onToggle = { caseAction("close_case", c.id, "Closed ${c.name}") })
                }
            }
            if (closed.isNotEmpty()) {
                item {
                    TextButton(onClick = { showClosed = !showClosed }) {
                        Text((if (showClosed) "Hide" else "Show") + " finished (${closed.size})")
                    }
                }
                if (showClosed) items(closed, key = { "x" + it.id }) { c ->
                    CaseCard(c, state, onOpen = { openLink(ctx, c.lastLink.ifBlank { c.sourceUrl }) },
                        onToggle = { caseAction("reopen_case", c.id, "Reopened ${c.name}") })
                }
            }
        }
    }

    if (showSettings) SettingsDialog(prefs, onDismiss = { showSettings = false; sync() })
    addText?.let { initial ->
        AddDialog(initial, onDismiss = { addText = null }) { link, note ->
            addText = null
            scope.launch {
                snackbar.showSnackbar("Logging… reading the page for dates")
                val err = withContext(Dispatchers.IO) {
                    runCatching { Api.post(prefs, "add", mapOf("url" to link, "text" to note)) }.exceptionOrNull()
                }
                if (err == null) { snackbar.showSnackbar("Tracking it ✅"); sync() } else snackbar.showSnackbar("Failed: ${err.message}")
            }
        }
    }
}

@Composable
private fun Section(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun EmptyCard(configured: Boolean) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp)) {
            Text(if (configured) "All quiet 🎉" else "Welcome 👋", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(6.dp))
            Text(
                if (configured) "Nothing being tracked yet. When an application confirmation lands in Gmail it shows up here automatically. " +
                    "For applications that never email you, tap \"Log application\" or share the page to AppTracker."
                else "Tap ⚙️ and paste your Apps Script web app URL and token to connect.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun AlertCard(a: Alert, caseName: String, onHandled: () -> Unit, onOpen: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Card(
        Modifier.fillMaxWidth().clickable { expanded = !expanded },
        colors = CardDefaults.cardColors(
            containerColor = if (a.isCritical) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer,
        ),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(a.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            if (caseName.isNotBlank()) Text(caseName, style = MaterialTheme.typography.labelMedium)
            if (a.body.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(a.body, style = MaterialTheme.typography.bodyMedium, maxLines = if (expanded) 50 else 3, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onHandled) { Text("Handled") }
                if (a.link.isNotBlank()) OutlinedButton(onClick = onOpen) { Text("Open email") }
            }
        }
    }
}

@Composable
private fun ActionCard(a: Action, state: TrackerState, onDone: () -> Unit, onOpen: () -> Unit) {
    val hours = Time.hoursLeft(a.deadline, state.zone)
    val urgent = hours != null && hours <= 48
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f).clickable(enabled = a.link.isNotBlank(), onClick = onOpen)) {
                Text(a.description, style = MaterialTheme.typography.titleSmall)
                Text(state.case(a.caseId)?.name.orEmpty(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (a.deadline.isNotBlank()) {
                    Text(
                        "Due ${Time.pretty(a.deadline, state.zone)} · ${Time.countdown(a.deadline, state.zone)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (urgent) Urgent else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = if (urgent) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            FilledTonalButton(onClick = onDone) { Text("Done") }
        }
    }
}

@Composable
private fun CaseCard(c: Case, state: TrackerState, onOpen: () -> Unit, onToggle: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth().clickable { expanded = !expanded }) {
        Column(Modifier.padding(16.dp)) {
            Text(c.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                AssistChip(onClick = {}, label = { Text(c.stage.replace('_', ' ')) })
                if (c.outcome.isNotBlank() && c.outcome != "none") AssistChip(onClick = {}, label = { Text(c.outcome) })
            }
            if (c.windowEnd.isNotBlank() && c.isOpen) {
                val range = if (c.windowStart.isNotBlank() && c.windowStart != c.windowEnd)
                    Time.pretty(c.windowStart, state.zone) + " – " + Time.pretty(c.windowEnd, state.zone)
                else Time.pretty(c.windowEnd, state.zone)
                Text("Expect a response: $range", style = MaterialTheme.typography.bodySmall)
            }
            if (c.summary.isNotBlank()) {
                Text(c.summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = if (expanded) 20 else 2, overflow = TextOverflow.Ellipsis)
            }
            if (expanded) {
                if (c.history.isNotBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Text("History", style = MaterialTheme.typography.labelLarge)
                    Text(c.history, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (c.lastLink.isNotBlank() || c.sourceUrl.isNotBlank()) OutlinedButton(onClick = onOpen) { Text(if (c.lastLink.isNotBlank()) "Latest email" else "Open page") }
                    TextButton(onClick = onToggle) { Text(if (c.isOpen) "Mark finished" else "Reopen") }
                }
            }
        }
    }
}

@Composable
private fun AddDialog(initial: String, onDismiss: () -> Unit, onAdd: (String, String) -> Unit) {
    val url0 = Regex("https?://\\S+").find(initial)?.value.orEmpty()
    var link by remember { mutableStateOf(url0) }
    var note by remember { mutableStateOf(initial.replace(url0, "").trim()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Log an application") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("For applications that may not email you. AppTracker reads the page to find the results date.", style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(link, { link = it }, label = { Text("Link to the programme / application") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.fillMaxWidth())
                OutlinedTextField(note, { note = it }, label = { Text("Note (what you applied for)") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = { Button(onClick = { onAdd(link, note) }, enabled = link.isNotBlank() || note.isNotBlank()) { Text("Track it") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun SettingsDialog(prefs: Prefs, onDismiss: () -> Unit) {
    val ctx = LocalContext.current
    var url by remember { mutableStateOf(prefs.url) }
    var token by remember { mutableStateOf(prefs.token) }
    var testing by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Connect") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(url, { url = it }, label = { Text("Web app URL (…/exec)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(token, { token = it }, label = { Text("APP_TOKEN") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(enabled = !testing, onClick = {
                        prefs.url = url; prefs.token = token
                        testing = true; result = ""
                        scope.launch {
                            result = Sync.run(ctx)?.let { "❌ $it" } ?: "✅ Connected. ${prefs.state().cases.size} application(s) found."
                            testing = false
                        }
                    }) { Text("Test connection") }
                    if (testing) CircularProgressIndicator(Modifier.padding(start = 12.dp).size(20.dp), strokeWidth = 2.dp)
                }
                if (result.isNotBlank()) Text(result, style = MaterialTheme.typography.bodySmall)
                Text("Make alerts hard to miss", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 6.dp))
                TextButton(onClick = {
                    ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName))
                }) { Text("Notification settings (allow, sound, override Do Not Disturb)") }
                if (Build.VERSION.SDK_INT >= 34 && !ctx.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()) {
                    TextButton(onClick = {
                        ctx.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + ctx.packageName)))
                    }) { Text("Allow full-screen alerts (for acceptances & deadlines)") }
                }
            }
        },
        confirmButton = { Button(onClick = { prefs.url = url; prefs.token = token; onDismiss() }) { Text("Save") } },
    )
}

fun openLink(ctx: Context, link: String) {
    if (link.isBlank()) return
    runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}
