import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface DailyStats {
  date: string;
  tasksTotal: number;
  tasksCompleted: number;
  ritualCompleted: number;
  focusMinutes: number;
  completionRate: number;
}

interface WeeklyReport {
  weekNumber: number;
  year: number;
  stats: DailyStats[];
  totalFocusMinutes: number;
  avgCompletionRate: number;
  streakDays: number;
}

// --- Bar Chart ---

interface BarChartProps {
  stats: DailyStats[];
}

function WeekBarChart({ stats }: BarChartProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const BAR_MAX_H = 80;
  const BAR_W = 28;
  const GAP = 12;
  const CHART_W = stats.length * (BAR_W + GAP) - GAP;
  const CHART_H = BAR_MAX_H + 28; // bars + label row

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      style={{ overflow: 'visible' }}
      aria-label="本周每日完成率"
    >
      {stats.map((day, i) => {
        const barH = Math.max(4, Math.round((day.completionRate / 100) * BAR_MAX_H));
        const x = i * (BAR_W + GAP);
        const y = BAR_MAX_H - barH;
        const isToday = day.date === todayStr;

        return (
          <g key={day.date}>
            {/* Track */}
            <rect
              x={x}
              y={0}
              width={BAR_W}
              height={BAR_MAX_H}
              rx={6}
              fill="var(--color-bg-overlay)"
            />
            {/* Fill */}
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx={6}
              fill={isToday ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
              opacity={isToday ? 0.85 : 0.4}
            />
            {/* Day label */}
            <text
              x={x + BAR_W / 2}
              y={BAR_MAX_H + 18}
              textAnchor="middle"
              fontSize={11}
              fill={isToday ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
              fontWeight={isToday ? 600 : 400}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >
              {DAY_LABELS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Stat Card ---

interface StatCardProps {
  value: string;
  unit: string;
  label: string;
}

function StatCard({ value, unit, label }: StatCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardValueRow}>
        <span style={styles.cardValue}>{value}</span>
        <span style={styles.cardUnit}>{unit}</span>
      </div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

// --- ProgressPage ---

export default function ProgressPage() {
  const [daily, setDaily] = useState<DailyStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        fetch(`${API_BASE}/api/progress/daily?userId=default`),
        fetch(`${API_BASE}/api/progress/weekly?userId=default`),
      ]);
      if (dailyRes.ok) setDaily((await dailyRes.json()) as DailyStats);
      if (weeklyRes.ok) setWeekly((await weeklyRes.json()) as WeeklyReport);
    } catch {
      // Non-critical — render empty state
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>进度回顾</h1>

      {isLoading && <div style={styles.placeholder}>加载中…</div>}

      {!isLoading && (
        <>
          <div style={styles.statsRow}>
            <StatCard
              value={daily ? `${daily.completionRate}` : '—'}
              unit="%"
              label="今日完成率"
            />
            <StatCard
              value={weekly ? `${weekly.streakDays}` : '—'}
              unit="天"
              label="连续打卡"
            />
            <StatCard
              value={weekly ? `${weekly.totalFocusMinutes}` : '—'}
              unit="分"
              label="本周专注"
            />
          </div>

          <div style={styles.chartSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>本周完成率</span>
              {weekly && (
                <span style={styles.sectionSub}>
                  均 {weekly.avgCompletionRate}%
                </span>
              )}
            </div>
            <div style={styles.chartWrapper}>
              {weekly ? (
                <WeekBarChart stats={weekly.stats} />
              ) : (
                <div style={styles.placeholder}>暂无数据</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-bg-base)',
    padding: 'var(--spacing-lg)',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-lg)',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 'var(--spacing-sm)',
  },
  card: {
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    border: '1px solid var(--color-border)',
  },
  cardValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    lineHeight: 1,
  },
  cardUnit: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  cardLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  chartSection: {
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-md)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-md)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  sectionSub: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  chartWrapper: {
    width: '100%',
    paddingBottom: 'var(--spacing-sm)',
  },
  placeholder: {
    color: 'var(--color-text-muted)',
    fontSize: '15px',
    textAlign: 'center' as const,
    padding: 'var(--spacing-xl) 0',
  },
} as const;
