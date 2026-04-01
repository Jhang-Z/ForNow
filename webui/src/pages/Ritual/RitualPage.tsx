import { useEffect, useState } from 'react';

interface RitualTemplate {
  id: string;
  key: string;
  title: string;
  description: string | null;
  isOptional: boolean;
  order: number;
}

interface RitualEntry {
  id: string;
  userId: string;
  templateId: string;
  date: string;
  completed: boolean;
  content: string | null;
  completedAt: string | null;
}

interface TodayRitualData {
  traceId: string;
  templates: RitualTemplate[];
  entries: RitualEntry[];
  date: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export default function RitualPage() {
  const [data, setData] = useState<TodayRitualData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingKey, setCompletingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayRitual();
  }, []);

  async function fetchTodayRitual() {
    try {
      const res = await fetch(`${API_BASE}/api/ritual/today?userId=default`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as TodayRitualData);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete(templateKey: string) {
    if (completingKey) return;
    setCompletingKey(templateKey);

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const template = prev.templates.find((t) => t.key === templateKey);
      if (!template) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) =>
          e.templateId === template.id ? { ...e, completed: true } : e
        ),
      };
    });

    try {
      await fetch(`${API_BASE}/api/ritual/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default', templateKey }),
      });
    } catch {
      // Revert on failure
      await fetchTodayRitual();
    } finally {
      setCompletingKey(null);
    }
  }

  const completedCount = data
    ? data.entries.filter((e) => e.completed).length
    : 0;
  const totalCount = data ? data.templates.length : 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>今日任务</h1>
        <ProgressDots total={totalCount} completed={completedCount} />
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.placeholder}>加载中…</div>
        ) : data ? (
          <div style={styles.list}>
            {data.templates.map((template) => {
              const entry = data.entries.find((e) => e.templateId === template.id);
              return (
                <RitualItem
                  key={template.id}
                  template={template}
                  isCompleted={entry?.completed ?? false}
                  onComplete={() => handleComplete(template.key)}
                />
              );
            })}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ProgressDots({ total, completed }: { total: number; completed: number }) {
  return (
    <div style={styles.progressDots}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            ...styles.dot,
            ...(i < completed ? styles.dotActive : {}),
          }}
        />
      ))}
    </div>
  );
}

function RitualItem({
  template,
  isCompleted,
  onComplete,
}: {
  template: RitualTemplate;
  isCompleted: boolean;
  onComplete: () => void;
}) {
  return (
    <div style={styles.item}>
      <button
        onClick={isCompleted ? undefined : onComplete}
        style={{
          ...styles.checkbox,
          ...(isCompleted ? styles.checkboxDone : {}),
        }}
        aria-label={isCompleted ? '已完成' : '标记完成'}
      >
        {isCompleted && <CheckIcon />}
      </button>

      <div style={styles.itemContent}>
        <span
          style={{
            ...styles.itemTitle,
            ...(isCompleted ? styles.itemTitleDone : {}),
          }}
        >
          {template.title}
        </span>
        {template.description && (
          <span style={styles.itemDesc}>{template.description}</span>
        )}
      </div>

      {template.isOptional && (
        <span style={styles.optionalTag}>可选</span>
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

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-bg-base)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: 'var(--spacing-xl) var(--spacing-lg) var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-sm)',
  },
  pageTitle: {
    margin: 0,
    fontSize: '34px',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.5px',
    color: 'var(--color-text-primary)',
  },
  progressDots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--color-text-muted)',
    opacity: 0.3,
    transition: 'opacity var(--duration-normal) var(--easing-default), background var(--duration-normal) var(--easing-default)',
  },
  dotActive: {
    background: 'var(--color-primary)',
    opacity: 1,
  },
  main: {
    flex: 1,
    padding: '0 var(--spacing-lg) var(--spacing-lg)',
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
    borderBottom: '0.5px solid var(--color-separator, rgba(0,0,0,0.08))',
    minHeight: '72px',
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
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  itemTitle: {
    fontSize: '17px',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    lineHeight: '22px',
    transition: 'opacity var(--duration-normal) var(--easing-default)',
  },
  itemTitleDone: {
    opacity: 0.4,
    textDecoration: 'line-through',
  },
  itemDesc: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    lineHeight: '18px',
  },
  optionalTag: {
    flexShrink: 0,
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    background: 'var(--color-bg-overlay, rgba(0,0,0,0.06))',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontWeight: 400,
  },
  placeholder: {
    color: 'var(--color-text-muted)',
    fontSize: '17px',
    padding: 'var(--spacing-lg) 0',
  },
} as const;
