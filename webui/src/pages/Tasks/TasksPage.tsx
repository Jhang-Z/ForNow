import { useEffect, useRef, useState } from 'react';
import { db, type Task } from '../../bridge/db';

type TaskPriority = Task['priority'];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-text-muted)',
  medium: 'var(--color-primary)',
  high: 'var(--color-danger, #FF3B30)',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchTodayTasks();
  }, []);

  async function fetchTodayTasks() {
    try {
      setTasks(await db.tasks.getToday());
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isCompleted: true } : t)));

    try {
      await db.tasks.complete(taskId);
    } catch {
      await fetchTodayTasks();
    }
  }

  async function handleAddTask() {
    const title = inputValue.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    setInputValue('');

    const tempId = `temp_${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      userId: 'default',
      title,
      priority: 'medium',
      isCompleted: false,
      completedAt: null,
      missionId: null,
      dueDate: null,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, tempTask]);

    try {
      const created = await db.tasks.create(title);
      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddTask();
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>今日任务</h1>
        <p style={styles.subtitle}>
          {totalCount === 0 ? '今天还没有任务' : `${completedCount} / ${totalCount} 已完成`}
        </p>
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.placeholder}>加载中…</div>
        ) : tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>今天还没有任务，添加一个吧</p>
          </div>
        ) : (
          <div style={styles.list}>
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                isLast={index === tasks.length - 1}
                onComplete={() => handleComplete(task.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            style={styles.input}
            type="text"
            placeholder="添加任务…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button
            style={{
              ...styles.addButton,
              opacity: inputValue.trim() ? 1 : 0.3,
            }}
            onClick={handleAddTask}
            disabled={!inputValue.trim() || isSubmitting}
          >
            <PlusIcon />
          </button>
        </div>
      </footer>
    </div>
  );
}

function TaskRow({
  task,
  isLast,
  onComplete,
}: {
  task: Task;
  isLast: boolean;
  onComplete: () => void;
}) {
  return (
    <div
      style={{
        ...styles.item,
        ...(isLast ? { borderBottom: 'none' } : {}),
      }}
    >
      <button
        onClick={task.isCompleted ? undefined : onComplete}
        style={{
          ...styles.checkbox,
          ...(task.isCompleted ? styles.checkboxDone : {}),
        }}
        aria-label={task.isCompleted ? '已完成' : '标记完成'}
      >
        {task.isCompleted && <CheckIcon />}
      </button>

      <span
        style={{
          ...styles.itemTitle,
          ...(task.isCompleted ? styles.itemTitleDone : {}),
        }}
      >
        {task.title}
      </span>

      {task.priority !== 'medium' && (
        <span
          style={{
            ...styles.priorityTag,
            color: PRIORITY_COLOR[task.priority],
            borderColor: PRIORITY_COLOR[task.priority],
          }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l3 3 5-5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  page: {
    height: '100dvh',
    background: 'var(--color-bg-base)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: 'var(--spacing-xl) var(--spacing-lg) var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '34px',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.5px',
    color: 'var(--color-text-primary)',
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: 'var(--color-text-muted)',
  },
  main: {
    flex: 1,
    padding: '0 var(--spacing-lg)',
    overflowY: 'auto' as const,
  },
  list: {
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    padding: 'var(--spacing-md)',
    borderBottom: '0.5px solid var(--color-separator, rgba(255,255,255,0.06))',
    minHeight: '56px',
  },
  checkbox: {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1.5px solid var(--color-text-muted)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--duration-normal) var(--easing-spring)',
    padding: 0,
  },
  checkboxDone: {
    background: 'var(--color-primary)',
    border: '1.5px solid var(--color-primary)',
    cursor: 'default',
  },
  itemTitle: {
    flex: 1,
    fontSize: '17px',
    fontWeight: 400,
    color: 'var(--color-text-primary)',
    lineHeight: '22px',
    transition: 'opacity var(--duration-normal) var(--easing-ios)',
  },
  itemTitleDone: {
    opacity: 0.4,
    textDecoration: 'line-through',
  },
  priorityTag: {
    flexShrink: 0,
    fontSize: '11px',
    fontWeight: 500,
    border: '1px solid',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 6px',
  },
  emptyState: {
    padding: 'var(--spacing-xl) 0',
    display: 'flex',
    justifyContent: 'center',
  },
  emptyText: {
    margin: 0,
    fontSize: '15px',
    color: 'var(--color-text-muted)',
  },
  placeholder: {
    color: 'var(--color-text-muted)',
    fontSize: '17px',
    padding: 'var(--spacing-lg) 0',
  },
  footer: {
    padding: 'var(--spacing-md) var(--spacing-lg)',
    paddingBottom: 'calc(var(--spacing-md) + env(safe-area-inset-bottom, 0px))',
    borderTop: '0.5px solid var(--color-separator, rgba(255,255,255,0.06))',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-card)',
    padding: '0 var(--spacing-md)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '17px',
    color: 'var(--color-text-primary)',
    padding: 'var(--spacing-md) 0',
    caretColor: 'var(--color-primary)',
  },
  addButton: {
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity var(--duration-fast)',
  },
} as const;
