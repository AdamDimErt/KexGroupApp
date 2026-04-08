import { createRoot } from 'react-dom/client';
import { TasksBoard } from './components/TasksBoard';

createRoot(document.getElementById('tasks-root')!).render(
  <TasksBoard onClose={() => window.close()} />
);
