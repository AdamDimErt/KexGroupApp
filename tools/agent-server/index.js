const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../../');
const PORT = 3010;

const AGENT_DIRS = {
  leader:  '',
  auth:    'apps/auth-service',
  mobile:  'apps/mobile-dashboard',
  finance: 'apps/finance-service',
  worker:  'apps/aggregator-worker',
  gateway: 'apps/api-gateway',
  all:     '',
};

const AGENT_PROMPTS = {
  leader:  'Ты — Lead AI архитектор проекта KEX GROUP Dashboard. Анализируй задачи, координируй решения, пиши код если нужно.',
  auth:    'Ты — auth-agent KEX GROUP. Владеешь apps/auth-service. Стек: NestJS, JWT, OTP, Redis. Выполняй задачи строго в своей области.',
  mobile:  'Ты — mobile-agent KEX GROUP. Владеешь apps/mobile-dashboard. Стек: React Native, Expo, Zustand, React Query. Выполняй задачи строго в своей области.',
  finance: 'Ты — finance-agent KEX GROUP. Владеешь apps/finance-service. Стек: NestJS, Prisma, PostgreSQL. Выполняй задачи строго в своей области.',
  worker:  'Ты — worker-agent KEX GROUP. Владеешь apps/aggregator-worker. Стек: NestJS, iiko API, 1C OData, cron. Выполняй задачи строго в своей области.',
  gateway: 'Ты — gateway-agent KEX GROUP. Владеешь apps/api-gateway. Стек: NestJS, reverse proxy, guards. Выполняй задачи строго в своей области.',
  all:     'Ты — AI ассистент проекта KEX GROUP Dashboard. Помогай с любыми задачами по проекту.',
};

// Active processes map: taskId -> ChildProcess
const activeProcs = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', active: activeProcs.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

function send(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

wss.on('connection', (ws) => {
  console.log('[agent-server] client connected');

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { type, taskId, task, agent, description } = msg;

    // ── STOP ──────────────────────────────────────────────────────────
    if (type === 'stop') {
      const proc = activeProcs.get(taskId);
      if (proc) {
        proc.kill();
        activeProcs.delete(taskId);
        send(ws, { taskId, type: 'stopped' });
      }
      return;
    }

    // ── RUN ───────────────────────────────────────────────────────────
    if (type === 'run') {
      const agentKey = agent || 'leader';
      const agentDir = AGENT_DIRS[agentKey] ?? '';
      const cwd = path.join(ROOT, agentDir);
      const systemPrompt = AGENT_PROMPTS[agentKey] || AGENT_PROMPTS.all;

      const fullTask = description
        ? `${task}\n\nДополнительный контекст: ${description}`
        : task;

      const message = `${systemPrompt}\n\nЗАДАЧА: ${fullTask}`;

      console.log(`[agent-server] [${agentKey}] task: ${task.slice(0, 80)}...`);
      send(ws, { taskId, type: 'started', agent: agentKey, cwd });

      // spawn claude CLI in non-interactive mode
      const proc = spawn('claude', ['-p', message, '--dangerously-skip-permissions'], {
        cwd,
        shell: true,
        env: { ...process.env },
      });

      activeProcs.set(taskId, proc);

      proc.stdout.on('data', (data) => {
        send(ws, { taskId, type: 'output', data: data.toString() });
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        // filter out noise
        if (!text.includes('ExperimentalWarning') && !text.includes('DeprecationWarning')) {
          send(ws, { taskId, type: 'error', data: text });
        }
      });

      proc.on('close', (code) => {
        activeProcs.delete(taskId);
        send(ws, { taskId, type: 'done', exitCode: code });
        console.log(`[agent-server] [${agentKey}] done (exit ${code})`);
      });

      proc.on('error', (err) => {
        activeProcs.delete(taskId);
        send(ws, { taskId, type: 'error', data: `Ошибка запуска: ${err.message}` });
        send(ws, { taskId, type: 'done', exitCode: -1 });
      });
    }
  });

  ws.on('close', () => {
    console.log('[agent-server] client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`[agent-server] WebSocket server on ws://localhost:${PORT}`);
  console.log(`[agent-server] Health: http://localhost:${PORT}/health`);
  console.log(`[agent-server] Root: ${ROOT}`);
});
