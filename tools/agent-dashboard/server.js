const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3777;
const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
const TEAMS_DIR = path.join(CLAUDE_DIR, 'teams');
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks');
const PROJECT_DIR = 'D:\\kexgroupapp';

// Agent registry — leader updates this via API
let agentRegistry = {
  leader: {
    name: 'Leader (Orchestrator)',
    status: 'active',
    model: 'opus',
    color: 'purple',
    tasks: [],
    lastUpdate: Date.now(),
  },
  agents: {},
};

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return null; }
}

// Scan for agent output files
function scanAgentOutputs() {
  const tmpBase = path.join(process.env.LOCALAPPDATA || '', 'Temp', 'claude', 'D--kexgroupapp');
  const results = [];
  try {
    for (const session of fs.readdirSync(tmpBase)) {
      const tasksDir = path.join(tmpBase, session, 'tasks');
      try {
        for (const file of fs.readdirSync(tasksDir)) {
          if (file.endsWith('.output')) {
            const outputPath = path.join(tasksDir, file);
            try {
              const stat = fs.statSync(outputPath);
              const content = fs.readFileSync(outputPath, 'utf8');
              const lines = content.split('\n').filter(Boolean);
              const lastLines = lines.slice(-5);
              results.push({
                id: file.replace('.output', ''),
                size: stat.size,
                modified: stat.mtimeMs,
                lastLines,
                isGrowing: (Date.now() - stat.mtimeMs) < 30000,
              });
            } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  return results;
}

// Scan git status for recently modified files per service
function getRecentChanges() {
  try {
    const { execSync } = require('child_process');
    const status = execSync('git status --porcelain', { cwd: PROJECT_DIR, encoding: 'utf8', timeout: 5000 });
    const changes = {};
    for (const line of status.split('\n').filter(Boolean)) {
      const file = line.substring(3).trim();
      if (file.startsWith('apps/auth-service/')) (changes['auth-service'] = changes['auth-service'] || []).push(file);
      else if (file.startsWith('apps/api-gateway/')) (changes['api-gateway'] = changes['api-gateway'] || []).push(file);
      else if (file.startsWith('apps/finance-service/')) (changes['finance-service'] = changes['finance-service'] || []).push(file);
      else if (file.startsWith('apps/aggregator-worker/')) (changes['aggregator-worker'] = changes['aggregator-worker'] || []).push(file);
      else if (file.startsWith('apps/mobile-dashboard/')) (changes['mobile-dashboard'] = changes['mobile-dashboard'] || []).push(file);
      else if (file.startsWith('packages/')) (changes['packages'] = changes['packages'] || []).push(file);
    }
    return changes;
  } catch { return {}; }
}

function getTeams() {
  try {
    return fs.readdirSync(TEAMS_DIR).filter(d => {
      return fs.statSync(path.join(TEAMS_DIR, d)).isDirectory();
    });
  } catch { return []; }
}

function getTeamData(teamName) {
  const config = readJSON(path.join(TEAMS_DIR, teamName, 'config.json'));
  if (!config) return null;
  const inboxDir = path.join(TEAMS_DIR, teamName, 'inboxes');
  const inboxes = {};
  try {
    for (const file of fs.readdirSync(inboxDir)) {
      if (file.endsWith('.json')) {
        const name = file.replace('.json', '');
        inboxes[name] = readJSON(path.join(inboxDir, file)) || [];
      }
    }
  } catch {}
  const taskDir = path.join(TASKS_DIR, teamName);
  const tasks = [];
  try {
    for (const file of fs.readdirSync(taskDir)) {
      if (file.endsWith('.json') && file !== '.lock') {
        const task = readJSON(path.join(taskDir, file));
        if (task) tasks.push(task);
      }
    }
  } catch {}
  return { config, inboxes, tasks };
}

function apiHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.url === '/api/teams') {
    const teams = getTeams().map(name => {
      const data = getTeamData(name);
      return data ? { name, ...data } : { name };
    });
    res.end(JSON.stringify(teams));
    return true;
  }

  if (req.url === '/api/status') {
    const outputs = scanAgentOutputs();
    const changes = getRecentChanges();
    res.end(JSON.stringify({
      registry: agentRegistry,
      outputs,
      changes,
      timestamp: Date.now(),
    }));
    return true;
  }

  if (req.url === '/api/registry' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.leader) Object.assign(agentRegistry.leader, data.leader, { lastUpdate: Date.now() });
        if (data.agents) {
          for (const [name, info] of Object.entries(data.agents)) {
            agentRegistry.agents[name] = { ...info, lastUpdate: Date.now() };
          }
        }
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  return false;
}

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>KEX Agent Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
    min-height: 100vh;
  }
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 20px 32px;
    border-bottom: 1px solid #2a2a4a;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header h1 { font-size: 20px; color: #fff; }
  .header h1 span { color: #7c5cfc; }
  .status-dot {
    width: 10px; height: 10px; border-radius: 50%;
    display: inline-block; margin-right: 8px;
    animation: pulse 2s infinite;
  }
  .status-dot.live { background: #00e676; }
  .status-dot.off { background: #666; animation: none; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .refresh-info { color: #888; font-size: 13px; }
  .container { max-width: 1400px; margin: 0 auto; padding: 24px; }

  /* Leader Card */
  .leader-section {
    background: linear-gradient(135deg, #1a1030 0%, #251540 100%);
    border: 1px solid #3a2a5a;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
  .leader-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .leader-icon {
    width: 52px; height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c5cfc, #b388ff);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  .leader-name { font-size: 18px; font-weight: 600; color: #d0b8ff; }
  .leader-sub { font-size: 13px; color: #888; margin-top: 4px; }
  .leader-stats {
    display: flex;
    gap: 32px;
  }
  .leader-stat { text-align: center; }
  .leader-stat .val { font-size: 28px; font-weight: 700; color: #b388ff; }
  .leader-stat .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }

  /* Tasks Overview */
  .tasks-overview {
    background: #12121f;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }
  .tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .tasks-title { font-size: 16px; font-weight: 600; color: #fff; }
  .tasks-stats {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }
  .tasks-stats span { padding: 4px 12px; border-radius: 10px; }
  .ts-done { background: #1b3a2a; color: #69f0ae; }
  .ts-prog { background: #3a3a1a; color: #ffd54f; }
  .ts-pend { background: #2a2a3a; color: #888; }
  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #1a1a2e;
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    margin-bottom: 8px;
    transition: border-color 0.2s;
  }
  .task-item:hover { border-color: #3a3a5a; }
  .task-dot {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  }
  .task-dot.completed { background: #69f0ae; }
  .task-dot.in_progress { background: #ffd54f; animation: pulse 2s infinite; }
  .task-dot.pending { background: #555; }
  .task-text { flex: 1; font-size: 13px; }
  .task-text.completed { color: #69f0ae; text-decoration: line-through; opacity: 0.7; }
  .task-text.in_progress { color: #ffd54f; font-weight: 500; }
  .task-text.pending { color: #888; }

  /* Agents Grid */
  .agents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .agent-card {
    background: #12121f;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    transition: border-color 0.3s, transform 0.2s;
  }
  .agent-card:hover {
    border-color: #7c5cfc;
    transform: translateY(-2px);
  }
  .agent-card .color-stripe {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 12px 12px 0 0;
  }
  .agent-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .agent-name { font-size: 17px; font-weight: 600; color: #fff; }
  .agent-target { font-size: 12px; color: #888; margin-top: 2px; font-family: monospace; }
  .agent-model {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    background: #2a2a4a;
    color: #aaa;
  }
  .agent-model.opus { background: #3a1a5e; color: #c77dff; }
  .agent-model.sonnet { background: #1a3a2e; color: #69f0ae; }
  .agent-model.haiku { background: #3a3a1a; color: #ffd54f; }

  .agent-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    font-size: 13px;
  }
  .status-badge {
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }
  .status-badge.working { background: #1b3a2a; color: #69f0ae; }
  .status-badge.idle { background: #3a3a1a; color: #ffd54f; }
  .status-badge.done { background: #1a3a2a; color: #69f0ae; }
  .status-badge.error { background: #3a1a1a; color: #ef5350; }

  /* File changes */
  .changes-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #2a2a4a;
  }
  .changes-title {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .file-item {
    font-size: 12px;
    color: #69f0ae;
    font-family: monospace;
    padding: 2px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-item.new::before { content: '+ '; color: #69f0ae; }
  .file-item.modified::before { content: 'M '; color: #ffd54f; }

  /* Output log */
  .output-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #2a2a4a;
  }
  .output-line {
    font-size: 11px;
    color: #888;
    font-family: monospace;
    line-height: 1.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Progress bar */
  .progress-bar {
    height: 4px;
    background: #2a2a4a;
    border-radius: 2px;
    margin-top: 14px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .empty { text-align: center; padding: 60px 40px; color: #555; font-size: 15px; }
  .empty .big { font-size: 48px; margin-bottom: 16px; display: block; }

  /* Footer */
  .footer {
    text-align: center;
    padding: 20px;
    color: #333;
    font-size: 12px;
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1><span>KEX</span> Agent Dashboard</h1>
  </div>
  <div style="display:flex;align-items:center;gap:16px">
    <span class="refresh-info">Auto-refresh: 3s</span>
    <span><span class="status-dot live" id="liveDot"></span>Live</span>
  </div>
</div>
<div class="container" id="app">
  <div class="empty"><span class="big">&#9881;</span>Loading...</div>
</div>
<div class="footer">KEX GROUP Agent Dashboard &middot; localhost:3777</div>

<script>
const COLORS = {
  purple: '#b388ff',
  blue: '#42a5f5',
  green: '#66bb6a',
  red: '#ef5350',
  yellow: '#ffd54f',
  orange: '#ffa726',
  cyan: '#26c6da',
  pink: '#ec407a',
};

const AGENT_META = {
  'auth-agent': { color: 'blue', target: 'apps/auth-service/', model: 'opus', desc: 'Auth: OTP, JWT, модули, тесты' },
  'gateway-agent': { color: 'green', target: 'apps/api-gateway/', model: 'opus', desc: 'Gateway: Guards, Swagger, прокси' },
  'finance-agent': { color: 'orange', target: 'apps/finance-service/', model: 'opus', desc: 'Finance: 4-level drill-down API' },
  'worker-agent': { color: 'red', target: 'apps/aggregator-worker/', model: 'sonnet', desc: 'Worker: iiko sync, 1C, Cost Allocation' },
  'mobile-agent': { color: 'cyan', target: 'apps/mobile-dashboard/', model: 'sonnet', desc: 'Mobile: React Native + Expo' },
};

const SERVICE_MAP = {
  'auth-service': 'auth-agent',
  'api-gateway': 'gateway-agent',
  'finance-service': 'finance-agent',
  'aggregator-worker': 'worker-agent',
  'mobile-dashboard': 'mobile-agent',
};

function getModelClass(m) {
  if (!m) return '';
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return '';
}

function timeAgo(ms) {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return sec + 's ago';
  if (sec < 3600) return Math.floor(sec/60) + 'm ago';
  return Math.floor(sec/3600) + 'h ago';
}

function render(data) {
  const app = document.getElementById('app');
  const { registry, outputs, changes } = data;
  const leader = registry.leader;
  const agents = registry.agents;

  // Merge agent meta with registry + changes + outputs
  const agentNames = Object.keys(AGENT_META);
  const activeAgents = {};

  for (const name of agentNames) {
    const meta = AGENT_META[name];
    const reg = agents[name] || {};
    const serviceName = meta.target.replace('apps/', '').replace('/', '');
    const serviceChanges = changes[serviceName] || [];
    const isRegistered = !!agents[name];

    // Check if agent has file changes (means it's working or has worked)
    const isActive = isRegistered || serviceChanges.length > 0;
    const isWorking = serviceChanges.length > 0 && outputs.some(o => o.isGrowing);

    activeAgents[name] = {
      ...meta,
      ...reg,
      name,
      serviceName,
      fileChanges: serviceChanges,
      isActive,
      isWorking: reg.status === 'working' || isWorking,
      isDone: reg.status === 'done',
    };
  }

  const totalAgents = Object.values(activeAgents).filter(a => a.isActive).length;
  const workingAgents = Object.values(activeAgents).filter(a => a.isWorking).length;
  const doneAgents = Object.values(activeAgents).filter(a => a.isDone).length;
  const totalFiles = Object.values(changes).flat().length;

  // Leader section
  let html = '';
  html += '<div class="leader-section">';
  html += '<div class="leader-left">';
  html += '<div class="leader-icon">&#9733;</div>';
  html += '<div>';
  html += '<div class="leader-name">Leader (Orchestrator)</div>';
  html += '<div class="leader-sub">Opus &middot; Distributes tasks, reviews results, injects contracts</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="leader-stats">';
  html += '<div class="leader-stat"><div class="val">' + totalAgents + '</div><div class="lbl">Agents</div></div>';
  html += '<div class="leader-stat"><div class="val">' + workingAgents + '</div><div class="lbl">Working</div></div>';
  html += '<div class="leader-stat"><div class="val">' + doneAgents + '</div><div class="lbl">Done</div></div>';
  html += '<div class="leader-stat"><div class="val">' + totalFiles + '</div><div class="lbl">Files Changed</div></div>';
  html += '</div>';
  html += '</div>';

  // Tasks overview (from leader)
  if (leader.tasks && leader.tasks.length > 0) {
    const done = leader.tasks.filter(t => t.status === 'completed').length;
    const prog = leader.tasks.filter(t => t.status === 'in_progress').length;
    const pend = leader.tasks.filter(t => t.status === 'pending').length;

    html += '<div class="tasks-overview">';
    html += '<div class="tasks-header">';
    html += '<div class="tasks-title">Task Progress</div>';
    html += '<div class="tasks-stats">';
    if (done > 0) html += '<span class="ts-done">' + done + ' done</span>';
    if (prog > 0) html += '<span class="ts-prog">' + prog + ' active</span>';
    if (pend > 0) html += '<span class="ts-pend">' + pend + ' pending</span>';
    html += '</div>';
    html += '</div>';
    for (const t of leader.tasks) {
      const st = t.status || 'pending';
      html += '<div class="task-item">';
      html += '<div class="task-dot ' + st + '"></div>';
      html += '<div class="task-text ' + st + '">' + t.text + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // Agents grid
  html += '<div class="agents-grid">';
  for (const name of agentNames) {
    const a = activeAgents[name];
    const color = COLORS[a.color] || '#888';
    const statusClass = a.isDone ? 'done' : a.isWorking ? 'working' : a.isActive ? 'working' : 'idle';
    const statusText = a.isDone ? 'Done' : a.isWorking ? 'Working...' : a.isActive ? 'Active' : 'Waiting';

    html += '<div class="agent-card">';
    html += '<div class="color-stripe" style="background:' + color + '"></div>';
    html += '<div class="agent-top">';
    html += '<div>';
    html += '<div class="agent-name" style="color:' + color + '">' + name + '</div>';
    html += '<div class="agent-target">' + a.target + '</div>';
    html += '</div>';
    html += '<span class="agent-model ' + getModelClass(a.model) + '">' + (a.model || '?') + '</span>';
    html += '</div>';

    html += '<div class="agent-status-row">';
    html += '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
    html += '<span style="color:#666;font-size:12px">' + (a.desc || '') + '</span>';
    html += '</div>';

    // File changes
    if (a.fileChanges && a.fileChanges.length > 0) {
      html += '<div class="changes-section">';
      html += '<div class="changes-title">Files Changed (' + a.fileChanges.length + ')</div>';
      const displayFiles = a.fileChanges.slice(0, 8);
      for (const f of displayFiles) {
        const isNew = f.startsWith('?') || f.includes('??');
        html += '<div class="file-item ' + (isNew ? 'new' : 'modified') + '">' + f.replace(/^apps\\/[^/]+\\//, '') + '</div>';
      }
      if (a.fileChanges.length > 8) {
        html += '<div style="font-size:11px;color:#555;margin-top:4px">...and ' + (a.fileChanges.length - 8) + ' more</div>';
      }
      html += '</div>';
    }

    // Progress bar
    if (a.isWorking || a.isActive) {
      const pct = a.isDone ? 100 : a.fileChanges.length > 0 ? Math.min(90, a.fileChanges.length * 10) : 10;
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    }

    html += '</div>';
  }
  html += '</div>';

  // Active outputs
  const activeOutputs = outputs.filter(o => o.isGrowing);
  if (activeOutputs.length > 0) {
    html += '<div class="tasks-overview">';
    html += '<div class="tasks-header">';
    html += '<div class="tasks-title">Live Agent Output (' + activeOutputs.length + ' active)</div>';
    html += '</div>';
    for (const o of activeOutputs) {
      html += '<div style="margin-bottom:12px">';
      html += '<div style="font-size:12px;color:#7c5cfc;margin-bottom:6px">Agent ' + o.id.substring(0,8) + '... &middot; ' + (o.size/1024).toFixed(1) + ' KB &middot; ' + timeAgo(o.modified) + '</div>';
      for (const line of o.lastLines) {
        html += '<div class="output-line">' + line.replace(/</g, '&lt;').substring(0, 120) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  // Teams (legacy support)
  const teams = window.__teams || [];
  if (teams.length > 0) {
    html += '<div class="tasks-overview">';
    html += '<div class="tasks-header"><div class="tasks-title">Agent Teams (TeamCreate)</div></div>';
    html += '<div style="color:#888;font-size:13px">' + teams.length + ' team(s) registered</div>';
    html += '</div>';
  }

  app.innerHTML = html;
}

async function refresh() {
  try {
    const [statusRes, teamsRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/teams'),
    ]);
    const status = await statusRes.json();
    window.__teams = await teamsRes.json();
    render(status);
    document.getElementById('liveDot').className = 'status-dot live';
  } catch (e) {
    document.getElementById('liveDot').className = 'status-dot off';
  }
}

refresh();
setInterval(refresh, 3000);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (apiHandler(req, res)) return;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log('KEX Agent Dashboard running at http://localhost:' + PORT);
});

// Keep alive — server.listen already keeps the event loop open
