import { useEffect, useState } from 'react';
import { db, type RitualItem } from '../../bridge/db';

export default function RitualPage() {
  const [items, setItems] = useState<RitualItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchTodayRitual();
  }, []);

  async function fetchTodayRitual() {
    setHasError(false);
    setIsLoading(true);
    try {
      setItems(await db.ritual.getToday());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete(templateId: string) {
    if (completingId) return;
    setCompletingId(templateId);

    // Optimistic update
    setItems((prev) => prev.map((item) =>
      item.templateId === templateId ? { ...item, isCompleted: true } : item
    ));

    try {
      await db.ritual.complete(templateId);
    } catch {
      await fetchTodayRitual();
    } finally {
      setCompletingId(null);
    }
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>今日任务</h1>
        <ProgressDots total={totalCount} completed={completedCount} />
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.list}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={styles.skeletonRow}>
                <div style={styles.skeletonCircle} />
                <div style={{ ...styles.skeletonBar, width: `${55 + i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>加载失败，下拉刷新</p>
            <button style={styles.retryBtn} onClick={() => void fetchTodayRitual()}>
              重试
            </button>
          </div>
        ) : items.length > 0 ? (
          <div style={styles.list}>
            {items.map((item) => (
              <RitualItemRow
                key={item.templateId}
                item={item}
                onComplete={() => handleComplete(item.templateId)}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyBox}>
            <p style={styles.emptyText}>今日仪式还没有内容</p>
            <p style={styles.emptyHint}>仪式模板初始化后将自动出现在这里</p>
          </div>
        )}
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

function RitualItemRow({
  item,
  onComplete,
}: {
  item: RitualItem;
  onComplete: () => void;
}) {
  return (
    <div style={styles.item}>
      <button
        onClick={item.isCompleted ? undefined : onComplete}
        style={{
          ...styles.checkbox,
          ...(item.isCompleted ? styles.checkboxDone : {}),
        }}
        aria-label={item.isCompleted ? '已完成' : '标记完成'}
      >
        {item.isCompleted && <CheckIcon />}
      </button>

      <div style={styles.itemContent}>
        <span
          style={{
            ...styles.itemTitle,
            ...(item.isCompleted ? styles.itemTitleDone : {}),
          }}
        >
          {item.title}
        </span>
      </div>
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
  skeletonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    padding: 'var(--spacing-md)',
    borderBottom: '0.5px solid var(--color-separator, rgba(0,0,0,0.08))',
    minHeight: '72px',
  },
  skeletonCircle: {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--color-text-muted)',
    opacity: 0.18,
  },
  skeletonBar: {
    height: '14px',
    borderRadius: '6px',
    background: 'var(--color-text-muted)',
    opacity: 0.15,
  },
  errorBox: {
    padding: 'var(--spacing-xl) var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-md)',
    alignItems: 'flex-start',
  },
  errorText: {
    margin: 0,
    fontSize: '17px',
    color: 'var(--color-text-secondary)',
  },
  retryBtn: {
    padding: '10px var(--spacing-lg)',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyBox: {
    padding: 'var(--spacing-xl) var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-xs)',
  },
  emptyText: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  emptyHint: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--color-text-muted)',
  },
} as const;
