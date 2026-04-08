import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, Circle, Clock, X, Loader2, Plus,
  MessageSquare, Calendar, Zap, Send, ArrowRight,
  Activity,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TaskStatus   = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface ScheduleConfig {
  cron: string;
  label: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  service?: string;
  routedTo?: string;      // если задача создана через leader — кому он её назначил
  phase?: string;
  schedule?: ScheduleConfig;
  comments: Comment[];
  subtasks: Subtask[];
  progress?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
  blockedReason?: string;
  source: 'manual' | 'agent';
}

// ── agent-status.json format (existing) ────────────────────────────────────────
interface AgentTask {
  id: string;
  title: string;
  status: 'done' | 'active' | 'todo';
  completedBy?: string;
  completedAt?: string;
  progress?: number;
  subtasks?: { title: string; done: boolean }[];
  service?: string;
}
interface AgentPhase   { id: string; title: string; tasks: AgentTask[]; }
interface ActivityEntry { timestamp: string; agent: string; action: string; type: 'info'|'done'|'error'|'start'|'review'; }
interface TokenUsage    { agent: string; inputTokens: number; outputTokens: number; totalTokens: number; requests: number; costUsd: number; model: string; }
interface AgentStatus {
  lastUpdated: string;
  phases: AgentPhase[];
  activityLog: ActivityEntry[];
  tokenStats?: {
    totalInputTokens: number; totalOutputTokens: number; totalTokens: number;
    totalRequests: number; totalCostUsd: number; byAgent: TokenUsage[];
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY          = 'kex-agent-tasks';
const CANCELLED_AGENTS_KEY = 'kex-cancelled-agent-tasks';
const POLL_INTERVAL        = 5000;

function loadCancelledAgents(): Set<string> {
  try { const r = localStorage.getItem(CANCELLED_AGENTS_KEY); return new Set(r ? JSON.parse(r) : []); }
  catch { return new Set(); }
}
function saveCancelledAgents(s: Set<string>) {
  localStorage.setItem(CANCELLED_AGENTS_KEY, JSON.stringify([...s]));
}

const AGENTS = ['leader','auth-service','finance-service','aggregator-worker','api-gateway','mobile-dashboard'];

const AGENT_COLORS: Record<string,string> = {
  'leader':'#8B5CF6','auth-service':'#3B82F6','aggregator-worker':'#F59E0B',
  'finance-service':'#10B981','api-gateway':'#EC4899','mobile-dashboard':'#06B6D4',
};
const AGENT_LABELS: Record<string,string> = {
  'leader':'leader','auth-service':'auth','aggregator-worker':'worker',
  'finance-service':'finance','api-gateway':'gateway','mobile-dashboard':'mobile',
};

const PRIORITY: Record<TaskPriority,{ color:string; label:string; sym:string }> = {
  critical: { color:'#EF4444', label:'Критический', sym:'●' },
  high:     { color:'#F59E0B', label:'Высокий',     sym:'●' },
  medium:   { color:'#3B82F6', label:'Средний',     sym:'●' },
  low:      { color:'#6B7280', label:'Низкий',      sym:'○' },
};

const STATUS: Record<TaskStatus,{ label:string; color:string; bg:string }> = {
  todo:        { label:'Ожидает',     color:'#6B7280', bg:'rgba(107,114,128,0.1)' },
  in_progress: { label:'В процессе',  color:'#3B82F6', bg:'rgba(59,130,246,0.1)'  },
  blocked:     { label:'Блокировано', color:'#EF4444', bg:'rgba(239,68,68,0.1)'   },
  done:        { label:'Готово',      color:'#10B981', bg:'rgba(16,185,129,0.1)'  },
  cancelled:   { label:'Отменено',    color:'#4B5563', bg:'rgba(75,85,99,0.06)'   },
};

const SCHEDULES = [
  { cron:'*/15 * * * *', label:'Каждые 15 мин'      },
  { cron:'*/30 * * * *', label:'Каждые 30 мин'      },
  { cron:'0 * * * *',    label:'Каждый час'          },
  { cron:'0 */3 * * *',  label:'Каждые 3 часа'      },
  { cron:'0 3 * * *',    label:'Ежедневно 03:00'    },
  { cron:'0 9 * * 1',    label:'Пн 09:00'            },
];

// ─── Leader auto-routing ────────────────────────────────────────────────────────
function leaderRoute(title: string, desc?: string): string {
  const text = `${title} ${desc ?? ''}`.toLowerCase();
  if (/auth|login|otp|токен|token|сессия|телефон|верифик|пароль/.test(text)) return 'auth-service';
  if (/mobile|экран|ui|expo|react native|интерфейс|дизайн|кнопк|стил/.test(text)) return 'mobile-dashboard';
  if (/iiko|sync|синхрон|worker|aggregator|расход|выручк|dds|касса|смен|отпечат/.test(text)) return 'aggregator-worker';
  if (/gateway|proxy|маршрут|роут|cors|middleware/.test(text)) return 'api-gateway';
  if (/finance|dashboard|отчёт|отчет|аналитик|прибыл|бюджет|затрат|p&l/.test(text)) return 'finance-service';
  return 'leader'; // не смог определить — остаётся у лидера
}

const TYPE_COLOR: Record<string,string> = { info:'#3B82F6', done:'#10B981', error:'#EF4444', start:'#F59E0B', review:'#A855F7' };
const TYPE_LABEL: Record<string,string> = { info:'ИНФО', done:'ГОТОВО', error:'ОШИБКА', start:'СТАРТ', review:'ПРОВЕРКА' };

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,9) + Date.now().toString(36); }

function fmtTime(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1)  return 'только что';
    if (diff < 60) return `${diff} мин назад`;
    const h = Math.floor(diff / 60);
    if (h < 24)    return `${h} ч назад`;
    return new Date(iso).toLocaleDateString('ru-RU',{ day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

function nextRun(cron: string): string {
  const now  = new Date();
  const next = new Date(now);
  const p    = cron.split(' ');
  if (p.length !== 5) return '?';
  const [min, hour] = p;
  if (min.startsWith('*/')) {
    const iv = parseInt(min.slice(2));
    const nm = Math.ceil((now.getMinutes() + 1) / iv) * iv;
    next.setMinutes(nm, 0, 0);
    if (next <= now) next.setMinutes(next.getMinutes() + iv);
  } else if (hour.startsWith('*/')) {
    const iv = parseInt(hour.slice(2));
    next.setHours(Math.ceil((now.getHours() + 1) / iv) * iv, 0, 0, 0);
    if (next <= now) next.setHours(next.getHours() + iv);
  } else if (min !== '*' && hour !== '*') {
    next.setHours(parseInt(hour), parseInt(min), 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  }
  const dm = Math.round((next.getTime() - now.getTime()) / 60000);
  if (dm < 60)  return `через ${dm} мин`;
  if (dm < 1440) return `через ${Math.round(dm/60)} ч`;
  return next.toLocaleTimeString('ru-RU',{ hour:'2-digit', minute:'2-digit' });
}

function loadTasks(): Task[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveTasks(t: Task[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

// ─── Small UI pieces ───────────────────────────────────────────────────────────
const UI   = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

function AgentBadge({ service }: { service?: string }) {
  if (!service) return null;
  const c = AGENT_COLORS[service] ?? '#6B7280';
  return (
    <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4,
      background:`${c}22`, color:c, border:`1px solid ${c}44`, fontFamily:MONO, flexShrink:0 }}>
      {AGENT_LABELS[service] ?? service}
    </span>
  );
}

function PriBadge({ p }: { p: TaskPriority }) {
  const cfg = PRIORITY[p];
  return <span style={{ fontSize:10, color:cfg.color, fontWeight:700, flexShrink:0 }}>{cfg.sym}</span>;
}

function StatBadge({ s }: { s: TaskStatus }) {
  const cfg = STATUS[s];
  return (
    <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}33`, fontFamily:MONO, flexShrink:0 }}>
      {cfg.label}
    </span>
  );
}

function ProgBar({ v, color='#3B82F6' }: { v:number; color?:string }) {
  return (
    <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${v}%`, background:`linear-gradient(90deg,${color},${color}99)`,
        borderRadius:2, transition:'width .6s ease' }} />
    </div>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, selected, onClick }: { task:Task; selected:boolean; onClick():void }) {
  const faded = task.status === 'done' || task.status === 'cancelled';
  return (
    <div onClick={onClick} style={{
      background: selected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.025)',
      border: selected ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius:10, padding:'10px 12px', cursor:'pointer', transition:'all .15s',
      opacity: faded ? 0.55 : 1,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:6 }}>
        <PriBadge p={task.priority} />
        <span style={{ fontSize:13, fontWeight:500, fontFamily:UI, lineHeight:1.4,
          color: faded ? 'rgba(239,246,255,0.4)' : 'rgba(239,246,255,0.85)',
          textDecoration: faded ? 'line-through' : 'none',
          textDecorationColor:'rgba(239,246,255,0.2)' }}>
          {task.title}
        </span>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {task.service && <AgentBadge service={task.service} />}
        {task.schedule && (
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <Clock style={{ width:10, height:10, color:'#A855F7' }} />
            <span style={{ fontSize:10, color:'#A855F7', fontFamily:MONO }}>{task.schedule.label}</span>
          </div>
        )}
        {task.comments.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <MessageSquare style={{ width:10, height:10, color:'rgba(239,246,255,0.25)' }} />
            <span style={{ fontSize:10, color:'rgba(239,246,255,0.25)', fontFamily:MONO }}>{task.comments.length}</span>
          </div>
        )}
        {task.subtasks.length > 0 && (
          <span style={{ fontSize:10, color:'rgba(239,246,255,0.25)', fontFamily:MONO }}>
            {task.subtasks.filter(s=>s.done).length}/{task.subtasks.length}
          </span>
        )}
        {task.source === 'agent' && (
          <span style={{ fontSize:9, color:'rgba(239,246,255,0.15)', fontFamily:MONO }}>agent</span>
        )}
      </div>
      {task.status === 'in_progress' && task.progress != null && (
        <div style={{ marginTop:8 }}><ProgBar v={task.progress} /></div>
      )}
      {task.status === 'blocked' && task.blockedReason && (
        <p style={{ fontSize:11, color:'#EF4444', fontFamily:UI, marginTop:6, lineHeight:1.3 }}>
          {task.blockedReason}
        </p>
      )}
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanCol({ status, tasks, selectedId, onSelect, onAdd, onCancelAll, onRestoreAll }: {
  status: TaskStatus; tasks: Task[]; selectedId: string|null;
  onSelect(id:string):void; onAdd?():void; onCancelAll?():void; onRestoreAll?():void;
}) {
  const cfg = STATUS[status];
  const agentTodoCount = tasks.filter(t => t.source === 'agent').length;
  const cancelledAgentCount = tasks.filter(t => t.source === 'agent').length;
  return (
    <div style={{ flex:1, minWidth:200, maxWidth:280, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10,
        padding:'7px 12px', borderRadius:8, background:cfg.bg, border:`1px solid ${cfg.color}22`, flexShrink:0 }}>
        <span style={{ fontSize:11, fontWeight:700, color:cfg.color, fontFamily:MONO,
          textTransform:'uppercase', letterSpacing:'0.08em' }}>{cfg.label}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:'0 5px', borderRadius:10,
          background:`${cfg.color}33`, color:cfg.color, fontFamily:MONO, marginLeft:'auto' }}>
          {tasks.length}
        </span>
        {onCancelAll && agentTodoCount > 0 && (
          <button onClick={e=>{e.stopPropagation();onCancelAll();}} title="Остановить все агент-задачи" style={{
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
            borderRadius:5, cursor:'pointer', color:'#EF4444', display:'flex',
            alignItems:'center', padding:'2px 5px', gap:3 }}>
            <X style={{ width:10, height:10 }} />
            <span style={{ fontSize:9, fontFamily:MONO, fontWeight:700 }}>{agentTodoCount}</span>
          </button>
        )}
        {onRestoreAll && cancelledAgentCount > 0 && (
          <button onClick={e=>{e.stopPropagation();onRestoreAll();}} title="Восстановить все агент-задачи" style={{
            background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)',
            borderRadius:5, cursor:'pointer', color:'#10B981', display:'flex',
            alignItems:'center', padding:'2px 6px', gap:3 }}>
            <span style={{ fontSize:9, fontFamily:MONO, fontWeight:700 }}>↩ {cancelledAgentCount}</span>
          </button>
        )}
        {onAdd && (
          <button onClick={e=>{e.stopPropagation();onAdd();}} style={{
            background:'transparent', border:'none', cursor:'pointer', color:cfg.color, display:'flex', padding:0 }}>
            <Plus style={{ width:13, height:13 }} />
          </button>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, overflowY:'auto', flex:1, minHeight:0 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} selected={selectedId===t.id} onClick={()=>onSelect(t.id)} />
        ))}
        {tasks.length === 0 && (
          <div style={{ padding:'20px 12px', textAlign:'center',
            border:'1px dashed rgba(255,255,255,0.06)', borderRadius:10 }}>
            <span style={{ fontSize:11, color:'rgba(239,246,255,0.15)', fontFamily:MONO }}>Нет задач</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Run Panel ───────────────────────────────────────────────────────────
const WS_URL = 'ws://localhost:3010';

function AgentRunPanel({ task }: { task: Task }) {
  const [lines, setLines]     = useState<{ type: string; text: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [wsOk, setWsOk]      = useState(false);
  const wsRef                 = useRef<WebSocket | null>(null);
  const bottomRef             = useRef<HTMLDivElement | null>(null);

  // Connect WebSocket once on mount
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen  = () => setWsOk(true);
    ws.onclose = () => { setWsOk(false); setRunning(false); };
    ws.onerror = () => setWsOk(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.taskId !== task.id) return;
        if (msg.type === 'started') {
          setRunning(true);
          setLines([{ type: 'info', text: `▶ Агент запущен: ${msg.agent} в ${msg.cwd}` }]);
        } else if (msg.type === 'output') {
          setLines(p => [...p, { type: 'out', text: msg.data }]);
        } else if (msg.type === 'error') {
          setLines(p => [...p, { type: 'err', text: msg.data }]);
        } else if (msg.type === 'done') {
          setRunning(false);
          setLines(p => [...p, { type: 'info', text: `■ Завершено (код ${msg.exitCode})` }]);
        } else if (msg.type === 'stopped') {
          setRunning(false);
          setLines(p => [...p, { type: 'info', text: '■ Остановлено' }]);
        }
      } catch { /* ignore */ }
    };
    return () => { ws.close(); };
  }, [task.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const run = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'run',
      taskId: task.id,
      task: task.title,
      description: task.description,
      agent: task.service?.replace('-service','').replace('-dashboard','').replace('aggregator-',''),
    }));
  }, [task]);

  const stop = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'stop', taskId: task.id }));
  }, [task.id]);

  const agentColor = AGENT_COLORS[task.service ?? ''] ?? '#6B7280';

  return (
    <section>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <SectionLabel>Агент</SectionLabel>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%',
            background: wsOk ? '#10B981' : '#EF4444',
            boxShadow: wsOk ? '0 0 6px #10B981' : 'none' }} />
          <span style={{ fontSize:9, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>
            {wsOk ? 'подключён' : 'нет сервера'}
          </span>
        </div>
      </div>

      {/* Run / Stop button */}
      <button
        onClick={running ? stop : run}
        disabled={!wsOk}
        style={{
          width:'100%', padding:'9px 14px', borderRadius:8, cursor: wsOk ? 'pointer' : 'not-allowed',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10,
          background: running
            ? 'rgba(239,68,68,0.1)'
            : wsOk ? `${agentColor}18` : 'rgba(255,255,255,0.03)',
          border: running
            ? '1px solid rgba(239,68,68,0.35)'
            : wsOk ? `1px solid ${agentColor}44` : '1px solid rgba(255,255,255,0.07)',
          color: running ? '#EF4444' : wsOk ? agentColor : 'rgba(239,246,255,0.2)',
          fontSize:13, fontWeight:700, fontFamily:MONO, transition:'all .15s',
        }}>
        {running ? (
          <>
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:2,
              background:'#EF4444', flexShrink:0 }} />
            Остановить агента
          </>
        ) : (
          <>
            <span style={{ fontSize:16 }}>▶</span>
            Запустить {AGENT_LABELS[task.service ?? ''] ?? 'агента'}
          </>
        )}
      </button>

      {/* Output terminal */}
      {lines.length > 0 && (
        <div style={{
          background:'#060E1A', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:8, padding:'10px 12px', maxHeight:320, overflowY:'auto',
          fontFamily:MONO, fontSize:11, lineHeight:1.6,
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              color: l.type === 'err' ? '#EF4444'
                   : l.type === 'info' ? 'rgba(239,246,255,0.35)'
                   : 'rgba(239,246,255,0.8)',
              whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>
              {l.text}
            </div>
          ))}
          {running && (
            <div style={{ display:'flex', gap:4, marginTop:4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:5, height:5, borderRadius:'50%', background:agentColor,
                  animation:`pulse 1.2s ${i*0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {lines.length > 0 && (
        <button onClick={() => setLines([])} style={{
          marginTop:6, background:'none', border:'none', cursor:'pointer',
          fontSize:10, color:'rgba(239,246,255,0.2)', fontFamily:MONO, padding:0,
        }}>
          очистить вывод
        </button>
      )}
    </section>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ task, onClose, onUpdate, onDelete, onCancelAgent, onRestoreAgent }: {
  task: Task; onClose():void;
  onUpdate(id:string, u:Partial<Task>):void;
  onDelete(id:string):void;
  onCancelAgent?(id:string):void;
  onRestoreAgent?(id:string):void;
}) {
  const [comment, setComment]         = useState('');
  const [subInput, setSubInput]       = useState('');
  const [blockReason, setBlockReason] = useState('');

  const addComment = () => {
    if (!comment.trim()) return;
    onUpdate(task.id, { comments:[...task.comments, { id:uid(), author:'You', text:comment.trim(), createdAt:new Date().toISOString() }] });
    setComment('');
  };
  const addSub = () => {
    if (!subInput.trim()) return;
    onUpdate(task.id, { subtasks:[...task.subtasks, { id:uid(), title:subInput.trim(), done:false }] });
    setSubInput('');
  };
  const toggleSub = (id:string) =>
    onUpdate(task.id, { subtasks:task.subtasks.map(s=>s.id===id?{...s,done:!s.done}:s) });

  const setStatus = (s:TaskStatus) => {
    const u: Partial<Task> = { status:s };
    if (s==='done')    { u.completedAt=new Date().toISOString(); u.completedBy='You'; }
    if (s==='blocked') { u.blockedReason=blockReason||undefined; }
    onUpdate(task.id, u);
  };

  const cfg    = STATUS[task.status];
  const priCfg = PRIORITY[task.priority];

  return (
    <div style={{ width:340, flexShrink:0, background:'#0A1628', border:'1px solid rgba(59,130,246,0.12)',
      borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:14, fontWeight:700, color:'#EFF6FF', fontFamily:UI, lineHeight:1.4, marginBottom:8 }}>
            {task.title}
          </p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <StatBadge s={task.status} />
            <span style={{ fontSize:10, color:priCfg.color, fontFamily:MONO, fontWeight:600 }}>
              {priCfg.sym} {priCfg.label}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
          <X style={{ width:16, height:16, color:'rgba(239,246,255,0.35)' }} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Meta */}
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {task.service && !task.routedTo && (
            <Row label="Агент"><AgentBadge service={task.service} /></Row>
          )}
          {task.routedTo && (
            <Row label="Назначил">
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4,
                  background:'rgba(139,92,246,0.18)', color:'#8B5CF6',
                  border:'1px solid rgba(139,92,246,0.35)', fontFamily:MONO }}>★ leader</span>
                <ArrowRight style={{ width:10, height:10, color:'rgba(239,246,255,0.3)' }} />
                <AgentBadge service={task.routedTo} />
              </div>
            </Row>
          )}
          {task.phase && (
            <Row label="Фаза"><span style={{ fontSize:11, color:'rgba(239,246,255,0.5)', fontFamily:MONO }}>{task.phase}</span></Row>
          )}
          {task.schedule && (
            <Row label="Расписание">
              <div style={{ textAlign:'right' }}>
                <div><span style={{ fontSize:11, color:'#A855F7', fontFamily:MONO }}>{task.schedule.label}</span></div>
                <div><span style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>
                  след: {nextRun(task.schedule.cron)}
                </span></div>
              </div>
            </Row>
          )}
          <Row label="Создана"><span style={{ fontSize:11, color:'rgba(239,246,255,0.4)', fontFamily:MONO }}>{fmtTime(task.createdAt)}</span></Row>
          {task.completedAt && (
            <Row label="Выполнена"><span style={{ fontSize:11, color:'#10B981', fontFamily:MONO }}>{fmtTime(task.completedAt)}</span></Row>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <section>
            <SectionLabel>Описание</SectionLabel>
            <p style={{ fontSize:13, color:'rgba(239,246,255,0.65)', fontFamily:UI, lineHeight:1.5 }}>{task.description}</p>
          </section>
        )}

        {/* Agent Run Panel — shown when task has a service assigned */}
        {task.service && <AgentRunPanel task={task} />}

        {/* Blocked */}
        {task.status === 'blocked' && (
          <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize:11, color:'#EF4444', fontFamily:MONO, fontWeight:600 }}>БЛОКИРОВАНО</span>
            {task.blockedReason && (
              <p style={{ fontSize:12, color:'rgba(239,246,255,0.6)', fontFamily:UI, marginTop:4 }}>{task.blockedReason}</p>
            )}
          </div>
        )}

        {/* Progress */}
        {task.status==='in_progress' && task.progress!=null && (
          <section>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <SectionLabel>Прогресс</SectionLabel>
              <span style={{ fontSize:11, color:'#3B82F6', fontFamily:MONO, fontWeight:700 }}>{task.progress}%</span>
            </div>
            <ProgBar v={task.progress} />
          </section>
        )}

        {/* Subtasks */}
        <section>
          <SectionLabel>Подзадачи ({task.subtasks.filter(s=>s.done).length}/{task.subtasks.length})</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
            {task.subtasks.map(s => (
              <div key={s.id} onClick={()=>toggleSub(s.id)} style={{
                display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                padding:'6px 8px', borderRadius:6,
                background: s.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)',
                border:`1px solid ${s.done?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.05)'}` }}>
                {s.done
                  ? <CheckCircle2 style={{ width:13, height:13, color:'#10B981', flexShrink:0 }} />
                  : <Circle style={{ width:13, height:13, color:'rgba(239,246,255,0.2)', flexShrink:0 }} />}
                <span style={{ fontSize:12, fontFamily:UI,
                  color: s.done ? 'rgba(239,246,255,0.3)' : 'rgba(239,246,255,0.65)',
                  textDecoration: s.done ? 'line-through' : 'none',
                  textDecorationColor:'rgba(239,246,255,0.2)' }}>{s.title}</span>
              </div>
            ))}
          </div>
          {task.source==='manual' && (
            <div style={{ display:'flex', gap:6 }}>
              <input value={subInput} onChange={e=>setSubInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addSub()} placeholder="Добавить подзадачу..."
                style={inputStyle} />
              <IconBtn onClick={addSub}><Plus style={{ width:12, height:12 }} /></IconBtn>
            </div>
          )}
        </section>

        {/* Comments */}
        <section>
          <SectionLabel>Комментарии ({task.comments.length})</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
            {task.comments.length === 0 && (
              <p style={{ fontSize:12, color:'rgba(239,246,255,0.2)', fontFamily:UI }}>Нет комментариев</p>
            )}
            {task.comments.map(c => (
              <div key={c.id} style={{ padding:'8px 10px', borderRadius:8,
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#3B82F6', fontFamily:MONO, fontWeight:600 }}>{c.author}</span>
                  <span style={{ fontSize:10, color:'rgba(239,246,255,0.25)', fontFamily:MONO }}>{fmtTime(c.createdAt)}</span>
                </div>
                <p style={{ fontSize:12, color:'rgba(239,246,255,0.65)', fontFamily:UI, lineHeight:1.4 }}>{c.text}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input value={comment} onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&addComment()} placeholder="Написать комментарий..."
              style={inputStyle} />
            <IconBtn onClick={addComment}><Send style={{ width:13, height:13 }} /></IconBtn>
          </div>
        </section>
      </div>

      {/* Footer: actions */}
      {task.source === 'agent' && task.status !== 'cancelled' && onCancelAgent && (
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={()=>{ onCancelAgent(task.id); onClose(); }} style={{
            width:'100%', background:'rgba(75,85,99,0.12)', border:'1px solid rgba(75,85,99,0.3)',
            borderRadius:6, padding:'7px', cursor:'pointer', fontSize:11,
            color:'rgba(239,246,255,0.45)', fontFamily:'JetBrains Mono, monospace' }}>
            Остановить задачу
          </button>
        </div>
      )}
      {task.source === 'agent' && task.status === 'cancelled' && onRestoreAgent && (
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={()=>{ onRestoreAgent(task.id); onClose(); }} style={{
            width:'100%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
            borderRadius:6, padding:'7px', cursor:'pointer', fontSize:11,
            color:'#10B981', fontFamily:'JetBrains Mono, monospace' }}>
            ↩ Восстановить задачу
          </button>
        </div>
      )}
      {task.source === 'manual' && (
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)',
          display:'flex', flexDirection:'column', gap:10 }}>
          <span style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO,
            textTransform:'uppercase', letterSpacing:'0.08em' }}>Статус</span>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(['todo','in_progress','blocked','done'] as TaskStatus[]).map(s => {
              if (s===task.status) return null;
              const c = STATUS[s];
              return (
                <button key={s} onClick={()=>setStatus(s)} style={{
                  fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:5,
                  background:c.bg, color:c.color, border:`1px solid ${c.color}33`,
                  cursor:'pointer', fontFamily:MONO }}>
                  {c.label}
                </button>
              );
            })}
          </div>
          {task.status !== 'blocked' && (
            <input value={blockReason} onChange={e=>setBlockReason(e.target.value)}
              placeholder="Причина блокировки (опционально)..."
              style={{ ...inputStyle, fontSize:11 }} />
          )}
          <button onClick={()=>onDelete(task.id)} style={{
            background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)',
            borderRadius:6, padding:'6px', cursor:'pointer', fontSize:11,
            color:'#EF4444', fontFamily:MONO }}>
            Удалить задачу
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Agent Picker ──────────────────────────────────────────────────────────────
const AGENT_DESCS: Record<string, string> = {
  'leader':             'Сам решит кому отдать',
  'auth-service':       'OTP, токены, сессии',
  'finance-service':    'Дашборд, аналитика, P&L',
  'aggregator-worker':  'iiko, 1C, синхронизация',
  'api-gateway':        'Proxy, роутинг, CORS',
  'mobile-dashboard':   'Экраны, UI, Expo',
};

function AgentPicker({ value, onChange }: { value: string; onChange(v:string):void }) {
  const allOptions = ['leader', ...AGENTS.filter(a => a !== 'leader')];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
      {allOptions.map(a => {
        const color = AGENT_COLORS[a] ?? '#6B7280';
        const label = AGENT_LABELS[a] ?? a;
        const isLeader = a === 'leader';
        const active = value === a;
        return (
          <button key={a} onClick={()=>onChange(a)} style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
            borderRadius:8, cursor:'pointer', textAlign:'left',
            background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
            border: active ? `1.5px solid ${color}55` : '1.5px solid rgba(255,255,255,0.07)',
            transition:'all .12s',
          }}>
            <div style={{
              width:28, height:28, borderRadius:7, flexShrink:0,
              background: active ? `${color}33` : `${color}18`,
              border: `1px solid ${color}44`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color, fontFamily:MONO,
            }}>
              {isLeader ? '★' : label.slice(0,1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color: active ? color : 'rgba(239,246,255,0.7)',
                fontFamily:MONO, lineHeight:1.2 }}>
                {isLeader ? 'Leader' : label}
              </div>
              <div style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:UI, lineHeight:1.3, marginTop:1 }}>
                {AGENT_DESCS[a]}
              </div>
            </div>
            {active && isLeader && (
              <div style={{ marginLeft:'auto', fontSize:9, color, fontFamily:MONO, fontWeight:700,
                padding:'2px 5px', borderRadius:4, background:`${color}22` }}>авто</div>
            )}
          </button>
        );
      })}
      <button onClick={()=>onChange('')} style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
        borderRadius:8, cursor:'pointer', textAlign:'left',
        background: value==='' ? 'rgba(107,114,128,0.12)' : 'rgba(255,255,255,0.03)',
        border: value==='' ? '1.5px solid rgba(107,114,128,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ width:28, height:28, borderRadius:7, background:'rgba(107,114,128,0.15)',
          border:'1px solid rgba(107,114,128,0.3)', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:16, color:'rgba(239,246,255,0.25)' }}>—</div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(239,246,255,0.4)', fontFamily:MONO }}>Без агента</div>
          <div style={{ fontSize:10, color:'rgba(239,246,255,0.2)', fontFamily:UI }}>Ручная задача</div>
        </div>
      </button>
    </div>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose():void; onCreate(t:Task):void }) {
  const [title, setTitle]         = useState('');
  const [desc, setDesc]           = useState('');
  const [priority, setPriority]   = useState<TaskPriority>('medium');
  const [service, setService]     = useState('leader');
  const [schedIdx, setSchedIdx]   = useState<number|null>(null);
  const [subInput, setSubInput]   = useState('');
  const [subtasks, setSubtasks]   = useState<Subtask[]>([]);
  const [routing, setRouting]     = useState<string|null>(null);

  // Предварительный роутинг при вводе — показываем куда пойдёт задача
  const previewRoute = service === 'leader' && title.trim().length > 3
    ? leaderRoute(title, desc)
    : null;

  const addSub = () => {
    if (!subInput.trim()) return;
    setSubtasks(p=>[...p,{ id:uid(), title:subInput.trim(), done:false }]);
    setSubInput('');
  };

  const create = () => {
    if (!title.trim()) return;
    const sched = schedIdx!=null ? { cron:SCHEDULES[schedIdx].cron, label:SCHEDULES[schedIdx].label } : undefined;

    let finalService = service || undefined;
    let routedTo: string|undefined = undefined;

    // Leader авторутинг
    if (service === 'leader') {
      const routed = leaderRoute(title, desc);
      if (routed !== 'leader') {
        routedTo = routed;
        finalService = routed; // физически отдаём агенту
      } else {
        finalService = 'leader';
      }
    }

    onCreate({
      id:uid(), title:title.trim(), description:desc.trim()||undefined,
      status:'todo', priority,
      service: finalService,
      routedTo,
      schedule:sched,
      comments:[], subtasks, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
      source:'manual',
    });
    onClose();
  };

  const ok = !!title.trim();
  const routeColor = previewRoute ? (AGENT_COLORS[previewRoute] ?? '#6B7280') : null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
      backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#0A1628', border:'1px solid rgba(59,130,246,0.2)',
        borderRadius:16, padding:28, width:520, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#EFF6FF', fontFamily:UI }}>Новая задача</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}>
            <X style={{ width:16, height:16, color:'rgba(239,246,255,0.4)' }} />
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* Title */}
          <Field label="Название *">
            <input autoFocus value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="Что нужно сделать..." style={{ ...inputStyle, width:'100%', boxSizing:'border-box' as const }} />
          </Field>

          {/* Description */}
          <Field label="Описание">
            <textarea value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="Детали задачи..." rows={2}
              style={{ ...inputStyle, width:'100%', boxSizing:'border-box' as const, resize:'vertical' as const }} />
          </Field>

          {/* Agent picker */}
          <Field label="Кому перекинуть задачу">
            <AgentPicker value={service} onChange={setService} />
            {/* Leader routing preview */}
            {previewRoute && previewRoute !== 'leader' && routeColor && (
              <div style={{ marginTop:8, padding:'7px 10px', borderRadius:7,
                background:`${routeColor}12`, border:`1px solid ${routeColor}30`,
                display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>Leader</span>
                <ArrowRight style={{ width:11, height:11, color:'rgba(239,246,255,0.3)' }} />
                <span style={{ fontSize:11, fontWeight:700, color:routeColor, fontFamily:MONO }}>
                  {AGENT_LABELS[previewRoute] ?? previewRoute}
                </span>
                <span style={{ fontSize:10, color:'rgba(239,246,255,0.35)', fontFamily:UI }}>
                  — авто-назначение
                </span>
              </div>
            )}
            {previewRoute === 'leader' && title.trim().length > 3 && (
              <div style={{ marginTop:8, padding:'7px 10px', borderRadius:7,
                background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)',
                fontSize:10, color:'rgba(239,246,255,0.4)', fontFamily:UI }}>
                Leader не смог определить агента — задача останется у него
              </div>
            )}
          </Field>

          {/* Priority */}
          <Field label="Приоритет">
            <div style={{ display:'flex', gap:6 }}>
              {(Object.keys(PRIORITY) as TaskPriority[]).map(p=>(
                <ChipBtn key={p} active={priority===p} color={PRIORITY[p].color} onClick={()=>setPriority(p)}>
                  {PRIORITY[p].label}
                </ChipBtn>
              ))}
            </div>
          </Field>

          {/* Schedule */}
          <Field label="Расписание">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <ChipBtn active={schedIdx===null} color="#3B82F6" onClick={()=>setSchedIdx(null)}>Разовая</ChipBtn>
              {SCHEDULES.map((s,i)=>(
                <ChipBtn key={i} active={schedIdx===i} color="#A855F7" onClick={()=>setSchedIdx(i)}>{s.label}</ChipBtn>
              ))}
            </div>
          </Field>

          {/* Subtasks */}
          <Field label="Подзадачи">
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
              {subtasks.map((s,i)=>(
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'4px 8px', borderRadius:5, background:'rgba(255,255,255,0.03)' }}>
                  <Circle style={{ width:11, height:11, color:'rgba(239,246,255,0.2)' }} />
                  <span style={{ fontSize:12, color:'rgba(239,246,255,0.6)', fontFamily:UI, flex:1 }}>{s.title}</span>
                  <button onClick={()=>setSubtasks(p=>p.filter((_,j)=>j!==i))}
                    style={{ background:'none', border:'none', cursor:'pointer' }}>
                    <X style={{ width:11, height:11, color:'rgba(239,246,255,0.3)' }} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input value={subInput} onChange={e=>setSubInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addSub()} placeholder="Добавить подзадачу..."
                style={inputStyle} />
              <IconBtn onClick={addSub}><Plus style={{ width:12, height:12 }} /></IconBtn>
            </div>
          </Field>

          {/* Buttons */}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, cursor:'pointer',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              color:'rgba(239,246,255,0.5)', fontSize:13, fontFamily:UI }}>Отмена</button>
            <button onClick={create} disabled={!ok} style={{ flex:2, padding:'10px', borderRadius:8,
              cursor: ok?'pointer':'not-allowed',
              background: ok?'rgba(59,130,246,0.18)':'rgba(255,255,255,0.04)',
              border: ok?'1px solid rgba(59,130,246,0.4)':'1px solid rgba(255,255,255,0.08)',
              color: ok?'#3B82F6':'rgba(239,246,255,0.2)',
              fontSize:13, fontFamily:UI, fontWeight:600 }}>
              {service==='leader' ? '★ Отдать Leader' : service ? `→ ${AGENT_LABELS[service]??service}` : 'Создать задачу'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Micro helpers (styled wrappers) ──────────────────────────────────────────
function Row({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:11, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>{label}</span>
      {children}
    </div>
  );
}
function SectionLabel({ children }: { children:React.ReactNode }) {
  return <span style={{ fontSize:11, color:'rgba(239,246,255,0.3)', fontFamily:MONO,
    textTransform:'uppercase' as const, letterSpacing:'0.08em', display:'block', marginBottom:8 }}>{children}</span>;
}
function Field({ label, children, style:st }: { label:string; children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={st}>
      <label style={{ fontSize:11, color:'rgba(239,246,255,0.4)', fontFamily:MONO,
        textTransform:'uppercase' as const, letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}
function IconBtn({ children, onClick }: { children:React.ReactNode; onClick():void }) {
  return (
    <button onClick={onClick} style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.22)',
      borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#3B82F6',
      display:'flex', alignItems:'center' }}>{children}</button>
  );
}
function ChipBtn({ active, color, onClick, children }: { active:boolean; color:string; onClick():void; children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer', flexShrink:0,
      background: active?`${color}22`:'rgba(255,255,255,0.04)',
      border: active?`1px solid ${color}44`:'1px solid rgba(255,255,255,0.08)',
      color: active?color:'rgba(239,246,255,0.4)', fontFamily:MONO }}>{children}</button>
  );
}
const inputStyle: React.CSSProperties = {
  flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
  borderRadius:6, padding:'6px 10px', fontSize:12, color:'rgba(239,246,255,0.75)',
  fontFamily:UI, outline:'none',
};
const selectStyle: React.CSSProperties = {
  width:'100%', background:'#0D1B2E', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:8, padding:'8px 10px', fontSize:12, color:'rgba(239,246,255,0.7)',
  fontFamily:MONO, outline:'none', cursor:'pointer',
};

// ─── Token Stats ───────────────────────────────────────────────────────────────
function TokenStats({ data }: { data: AgentStatus['tokenStats'] }) {
  if (!data) return null;
  return (
    <div style={{ padding:'12px 24px', borderTop:'1px solid rgba(255,255,255,0.04)',
      display:'flex', gap:16, alignItems:'center', flexShrink:0, overflowX:'auto' }}>
      <span style={{ fontSize:10, color:'rgba(239,246,255,0.25)', fontFamily:MONO, flexShrink:0 }}>ТОКЕНЫ</span>
      {[
        { label:'запросы', val:data.totalRequests },
        { label:'входящих', val:(data.totalInputTokens/1000).toFixed(1)+'K' },
        { label:'исходящих', val:(data.totalOutputTokens/1000).toFixed(1)+'K' },
        { label:'стоимость', val:'$'+data.totalCostUsd.toFixed(3) },
      ].map(s=>(
        <div key={s.label} style={{ display:'flex', gap:4, alignItems:'baseline', flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'rgba(239,246,255,0.6)', fontFamily:MONO }}>{s.val}</span>
          <span style={{ fontSize:10, color:'rgba(239,246,255,0.2)', fontFamily:MONO }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function TasksBoard({ onClose }: { onClose?: () => void }) {
  const [tasks,              setTasks]              = useState<Task[]>(loadTasks);
  const [agentStatus,        setAgentStatus]        = useState<AgentStatus|null>(null);
  const [cancelledAgentIds,  setCancelledAgentIds]  = useState<Set<string>>(loadCancelledAgents);
  const [selectedId,         setSelectedId]         = useState<string|null>(null);
  const [showCreate,         setShowCreate]         = useState(false);
  const [filterAgent,        setFilterAgent]        = useState('all');
  const [view,               setView]               = useState<'kanban'|'schedule'>('kanban');
  const [connected,          setConnected]          = useState(false);

  // Persist manual tasks
  useEffect(() => { saveTasks(tasks); }, [tasks]);

  // Persist cancelled agent task overrides
  useEffect(() => { saveCancelledAgents(cancelledAgentIds); }, [cancelledAgentIds]);

  const cancelAgentTask = (id: string) => {
    setCancelledAgentIds(prev => new Set([...prev, id]));
  };

  const restoreAgentTask = (id: string) => {
    setCancelledAgentIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const restoreAllCancelledAgentTasks = () => {
    const cancelledAgentIds2 = agentTasks.filter(t => t.status === 'cancelled').map(t => t.id);
    if (cancelledAgentIds2.length === 0) return;
    setCancelledAgentIds(prev => { const next = new Set(prev); cancelledAgentIds2.forEach(id => next.delete(id)); return next; });
  };

  const cancelAllTodoAgentTasks = () => {
    const todoAgentIds = agentTasks.filter(t => t.status === 'todo').map(t => t.id);
    if (todoAgentIds.length === 0) return;
    setCancelledAgentIds(prev => new Set([...prev, ...todoAgentIds]));
  };

  // Poll agent-status.json
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('./agent-status.json?t=' + Date.now());
        if (res.ok) { setAgentStatus(await res.json()); setConnected(true); }
        else setConnected(false);
      } catch { setConnected(false); }
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Convert agent tasks → Task format
  const agentTasks: Task[] = (agentStatus?.phases ?? []).flatMap(ph =>
    ph.tasks.map(at => {
      const id = `agent-${at.id}`;
      const baseStatus = (at.status==='active'?'in_progress':at.status) as TaskStatus;
      return {
      id,
      title:at.title,
      status: cancelledAgentIds.has(id) ? 'cancelled' as TaskStatus : baseStatus,
      priority:'medium' as TaskPriority,
      service:at.service,
      phase:ph.title,
      comments:[],
      subtasks:(at.subtasks??[]).map((s,i)=>({ id:`sub-${i}`, title:s.title, done:s.done })),
      progress:at.progress,
      createdAt:agentStatus?.lastUpdated ?? new Date().toISOString(),
      updatedAt:agentStatus?.lastUpdated ?? new Date().toISOString(),
      completedAt:at.completedAt,
      completedBy:at.completedBy,
      source:'agent' as const,
      };
    })
  );

  const all = [...tasks, ...agentTasks];
  const filtered = filterAgent==='all' ? all : all.filter(t=>t.service===filterAgent);
  const byStatus = (s:TaskStatus) => filtered.filter(t=>t.status===s);

  const createTask = (t:Task) => setTasks(p=>[t,...p]);
  const updateTask = (id:string, u:Partial<Task>) =>
    setTasks(p=>p.map(t=>t.id===id?{...t,...u,updatedAt:new Date().toISOString()}:t));
  const deleteTask = (id:string) => { setTasks(p=>p.filter(t=>t.id!==id)); if(selectedId===id) setSelectedId(null); };

  const selected = all.find(t=>t.id===selectedId);
  const scheduled = tasks.filter(t=>t.schedule);

  const stats = [
    { label:'всего',    val:all.length,                             color:'#6B7280' },
    { label:'активно',  val:all.filter(t=>t.status==='in_progress').length, color:'#3B82F6' },
    { label:'блок',     val:all.filter(t=>t.status==='blocked').length,     color:'#EF4444' },
    { label:'готово',   val:all.filter(t=>t.status==='done').length,        color:'#10B981' },
  ];

  return (
    <div style={{ height:'100vh', background:'#020508', display:'flex', flexDirection:'column', fontFamily:UI }}>

      {/* ── Header ── */}
      <div style={{ padding:'12px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8,
            background:'linear-gradient(135deg,#3B82F6,#8B5CF6)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap style={{ width:14, height:14, color:'#fff' }} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#EFF6FF', fontFamily:UI, lineHeight:1 }}>KEX Agents</p>
            <p style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>task board</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:8 }}>
          {stats.map(s=>(
            <div key={s.label} style={{ padding:'3px 10px', borderRadius:20,
              background:`${s.color}15`, border:`1px solid ${s.color}25`,
              display:'flex', gap:5, alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:MONO }}>{s.val}</span>
              <span style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Connection */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
          <div style={{ width:7, height:7, borderRadius:'50%',
            background:connected?'#10B981':'#4B5563',
            boxShadow:connected?'0 0 6px #10B981':'none' }} />
          <span style={{ fontSize:10, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>
            {connected?'агент подключён':'нет данных агента'}
          </span>
        </div>

        {/* View toggle */}
        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:2 }}>
          {(['kanban','schedule'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:'4px 10px', borderRadius:6, cursor:'pointer',
              background: view===v?'rgba(59,130,246,0.14)':'transparent',
              border: view===v?'1px solid rgba(59,130,246,0.3)':'1px solid transparent',
              color: view===v?'#3B82F6':'rgba(239,246,255,0.35)',
              fontSize:11, fontFamily:MONO }}>
              {v==='kanban'?'Канбан':'Расписание'}
            </button>
          ))}
        </div>

        {/* Create */}
        <button onClick={()=>setShowCreate(true)} style={{
          display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
          borderRadius:8, cursor:'pointer', background:'rgba(59,130,246,0.14)',
          border:'1px solid rgba(59,130,246,0.3)', color:'#3B82F6',
          fontSize:12, fontFamily:MONO, fontWeight:600 }}>
          <Plus style={{ width:13, height:13 }} /> Задача
        </button>

        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <X style={{ width:16, height:16, color:'rgba(239,246,255,0.35)' }} />
          </button>
        )}
      </div>

      {/* ── Agent filter bar ── */}
      <div style={{ padding:'7px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'flex', gap:6, alignItems:'center', flexShrink:0, overflowX:'auto' }}>
        <span style={{ fontSize:10, color:'rgba(239,246,255,0.2)', fontFamily:MONO, flexShrink:0 }}>Агент:</span>
        {['all',...AGENTS].map(a=>{
          const c = AGENT_COLORS[a] ?? '#6B7280';
          const lbl = a==='all'?'Все':(AGENT_LABELS[a]??a);
          const act = filterAgent===a;
          return (
            <button key={a} onClick={()=>setFilterAgent(a)} style={{
              padding:'3px 10px', borderRadius:20, cursor:'pointer', flexShrink:0,
              background: act?`${c}20`:'rgba(255,255,255,0.03)',
              border: act?`1px solid ${c}40`:'1px solid rgba(255,255,255,0.06)',
              color: act?c:'rgba(239,246,255,0.3)', fontSize:11, fontFamily:MONO }}>{lbl}</button>
          );
        })}
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

        {view==='kanban' ? (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            {/* Kanban board */}
            <div style={{ flex:1, display:'flex', gap:12, padding:'16px 24px',
              overflowX:'auto', overflowY:'hidden' }}>
              {(['todo','in_progress','blocked','done','cancelled'] as TaskStatus[]).map(s=>(
                <div key={s} style={{ flex:1, minWidth:200, maxWidth:280, display:'flex', flexDirection:'column' }}>
                  <KanbanCol
                    status={s} tasks={byStatus(s)} selectedId={selectedId}
                    onSelect={id=>setSelectedId(prev=>prev===id?null:id)}
                    onAdd={s==='todo'?()=>setShowCreate(true):undefined}
                    onCancelAll={s==='todo'?cancelAllTodoAgentTasks:undefined}
                    onRestoreAll={s==='cancelled'?restoreAllCancelledAgentTasks:undefined}
                  />
                </div>
              ))}
            </div>
            {/* Detail panel */}
            {selected && (
              <div style={{ padding:'16px 24px 16px 0', height:'100%', boxSizing:'border-box' as const, display:'flex' }}>
                <DetailPanel task={selected} onClose={()=>setSelectedId(null)}
                  onUpdate={updateTask} onDelete={deleteTask} onCancelAgent={cancelAgentTask} onRestoreAgent={restoreAgentTask} />
              </div>
            )}
          </div>
        ) : (
          /* Schedule view */
          <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
            {scheduled.length === 0 ? (
              <div style={{ padding:'80px 24px', textAlign:'center',
                border:'1px dashed rgba(255,255,255,0.07)', borderRadius:16, marginBottom:24 }}>
                <Calendar style={{ width:36, height:36, color:'rgba(239,246,255,0.08)', margin:'0 auto 12px' }} />
                <p style={{ fontSize:14, color:'rgba(239,246,255,0.2)', fontFamily:UI }}>Нет запланированных задач</p>
                <p style={{ fontSize:12, color:'rgba(239,246,255,0.12)', fontFamily:UI, marginTop:6 }}>
                  Создайте задачу и выберите расписание
                </p>
                <button onClick={()=>setShowCreate(true)} style={{
                  marginTop:16, padding:'8px 20px', borderRadius:8,
                  background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)',
                  color:'#3B82F6', fontSize:12, fontFamily:MONO, cursor:'pointer' }}>
                  + Новая задача
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginBottom:24 }}>
                {scheduled.map(task=>(
                  <div key={task.id}
                    onClick={()=>{ setView('kanban'); setSelectedId(task.id); }}
                    style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(168,85,247,0.15)',
                      borderRadius:12, padding:16, cursor:'pointer', transition:'all .15s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:'#EFF6FF', fontFamily:UI, lineHeight:1.3, flex:1 }}>
                        {task.title}
                      </p>
                      <StatBadge s={task.status} />
                    </div>
                    {task.schedule && (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Clock style={{ width:13, height:13, color:'#A855F7', flexShrink:0 }} />
                          <span style={{ fontSize:12, color:'#A855F7', fontFamily:MONO }}>{task.schedule.label}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <ArrowRight style={{ width:13, height:13, color:'rgba(239,246,255,0.2)', flexShrink:0 }} />
                          <span style={{ fontSize:11, color:'rgba(239,246,255,0.3)', fontFamily:MONO }}>
                            след. запуск: {nextRun(task.schedule.cron)}
                          </span>
                        </div>
                        <code style={{ fontSize:10, color:'rgba(168,85,247,0.7)', fontFamily:MONO,
                          background:'rgba(168,85,247,0.08)', padding:'2px 7px', borderRadius:4, display:'inline-block' }}>
                          {task.schedule.cron}
                        </code>
                      </div>
                    )}
                    {task.service && <div style={{ marginTop:10 }}><AgentBadge service={task.service} /></div>}
                  </div>
                ))}
              </div>
            )}

            {/* Activity log */}
            {agentStatus && agentStatus.activityLog.length > 0 && (
              <div>
                <p style={{ fontSize:11, color:'rgba(239,246,255,0.25)', fontFamily:MONO,
                  textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                  <Activity style={{ width:11, height:11, display:'inline', marginRight:6 }} />
                  Лог активности агентов
                </p>
                <div style={{ background:'#0A1628', border:'1px solid rgba(59,130,246,0.1)',
                  borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:5,
                  maxHeight:280, overflowY:'auto' }}>
                  {agentStatus.activityLog.slice(0,60).map((e,i)=>{
                    const c  = TYPE_COLOR[e.type] ?? '#6B7280';
                    const ac = AGENT_COLORS[e.agent] ?? AGENT_COLORS[e.agent+'-service'] ?? '#8B5CF6';
                    return (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start',
                        padding:'5px 10px', borderRadius:7, background:'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize:10, color:'rgba(239,246,255,0.2)', fontFamily:MONO, flexShrink:0, width:76 }}>
                          {fmtTime(e.timestamp)}
                        </span>
                        <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3,
                          background:`${c}22`, color:c, border:`1px solid ${c}33`, fontFamily:MONO, flexShrink:0 }}>
                          {TYPE_LABEL[e.type]??e.type}
                        </span>
                        <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3,
                          background:`${ac}22`, color:ac, border:`1px solid ${ac}33`, fontFamily:MONO, flexShrink:0 }}>
                          {e.agent}
                        </span>
                        <span style={{ fontSize:12, color:'rgba(239,246,255,0.6)', fontFamily:UI }}>{e.action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Token stats footer ── */}
      {agentStatus?.tokenStats && <TokenStats data={agentStatus.tokenStats} />}

      {/* ── Modals ── */}
      {showCreate && <CreateModal onClose={()=>setShowCreate(false)} onCreate={createTask} />}
    </div>
  );
}
