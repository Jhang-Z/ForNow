import { useEffect, useRef, useState } from 'react';
import { db, type CurrentMissionResult, type Mission, type WeeklyReport } from '../../bridge/db';
import { callNative, isNativeEnv } from '../../bridge/native';

type PeriodTab = 'week' | 'month' | 'year';

function haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (!isNativeEnv()) return;
  void callNative('haptic', { style });
}

export default function MissionPage() {
  const [data, setData] = useState<CurrentMissionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodTab>('week');
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchAll();
  }, []);

  async function fetchAll() {
    setHasError(false);
    setIsLoading(true);
    try {
      const [missionResult, report] = await Promise.all([
        db.mission.getCurrent(),
        db.progress.getWeekly(),
      ]);
      setData(missionResult);
      setWeeklyReport(report);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveMission() {
    if (!inputTitle.trim()) return;
    setIsSaving(true);
    try {
      if (isEditing && data?.mission) {
        await db.mission.update(data.mission.id, inputTitle.trim());
      } else {
        await db.mission.create(inputTitle.trim());
      }
      haptic('success');
      setInputTitle('');
      setShowInput(false);
      setIsEditing(false);
      setIsLoading(true);
      await fetchAll();
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit() {
    haptic('medium');
    setInputTitle(data?.mission?.title ?? '');
    setIsEditing(true);
    setShowInput(true);
  }

  function openCreate() {
    setInputTitle('');
    setIsEditing(false);
    setShowInput(true);
  }

  function handlePeriodChange(p: PeriodTab) {
    haptic('light');
    setActivePeriod(p);
  }

  const pageIndicators = [true, false, false, false];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.headerTitle}>Mission</span>
        <div style={styles.pageIndicators}>
          {pageIndicators.map((active, i) => (
            <span key={i} style={{ ...styles.dot, ...(active ? styles.dotActive : {}) }} />
          ))}
        </div>
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <LoadingCard />
        ) : hasError ? (
          <ErrorCard onRetry={() => void fetchAll()} />
        ) : data?.mission ? (
          <MissionCard
            mission={data.mission}
            activePeriod={activePeriod}
            weeklyReport={weeklyReport}
            onPeriodChange={handlePeriodChange}
            onEditMission={openEdit}
          />
        ) : (
          <EmptyCard
            weekNumber={data?.weekNumber}
            year={data?.year}
            onSetMission={openCreate}
          />
        )}
      </main>

      {showInput && (
        <div style={styles.inputOverlay} onClick={() => setShowInput(false)}>
          <div style={styles.inputSheet} onClick={(e) => e.stopPropagation()}>
            <p style={styles.inputLabel}>{isEditing ? '修改本周使命' : '设定本周使命'}</p>
            <input
              autoFocus
              style={styles.input}
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveMission(); }}
              placeholder="这周你想推进什么重要的事？"
              maxLength={60}
            />
            <div style={styles.inputActions}>
              <button style={styles.cancelBtn} onClick={() => setShowInput(false)}>取消</button>
              <button
                style={{ ...styles.confirmBtn, opacity: isSaving || !inputTitle.trim() ? 0.4 : 1 }}
                onClick={() => void handleSaveMission()}
                disabled={isSaving || !inputTitle.trim()}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LoadingCard() {
  return (
    <div style={styles.card}>
      <div style={styles.skeletonTag} />
      <div style={styles.skeletonWeek} />
      <div style={styles.skeletonLine} />
      <div style={{ ...styles.skeletonLine, width: '60%' }} />
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardTag}>本周任务</span>
      <p style={styles.errorText}>网络异常，请重试</p>
      <button style={styles.retryBtn} onClick={onRetry}>点击重试</button>
    </div>
  );
}

function MissionCard({
  mission,
  activePeriod,
  weeklyReport,
  onPeriodChange,
  onEditMission,
}: {
  mission: Mission;
  activePeriod: PeriodTab;
  weeklyReport: WeeklyReport | null;
  onPeriodChange: (p: PeriodTab) => void;
  onEditMission: () => void;
}) {
  const TABS: { key: PeriodTab; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTitlePointerDown() {
    longPressTimer.current = setTimeout(() => {
      onEditMission();
    }, 500);
  }

  function handleTitlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div style={styles.card}>
      <span style={styles.cardTag}>本周任务</span>
      <h1 style={styles.cardWeek}>第{mission.weekNumber}周</h1>

      {/* Long-press title to edit */}
      <div
        style={styles.missionTitleRow}
        onPointerDown={handleTitlePointerDown}
        onPointerUp={handleTitlePointerUp}
        onPointerCancel={handleTitlePointerUp}
        onClick={onEditMission}
      >
        <p style={styles.cardTitle}>{mission.title}</p>
        <span style={styles.editHint}>编辑</span>
      </div>

      {mission.description && (
        <p style={styles.cardDesc}>{mission.description}</p>
      )}

      {/* Period tabs */}
      <div style={styles.periodTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onPeriodChange(t.key)}
            style={{
              ...styles.periodTab,
              ...(activePeriod === t.key ? styles.periodTabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      <CalendarView period={activePeriod} weeklyReport={weeklyReport} />
    </div>
  );
}

function EmptyCard({
  weekNumber,
  year,
  onSetMission,
}: {
  weekNumber?: number;
  year?: number;
  onSetMission: () => void;
}) {
  return (
    <div style={styles.emptyCard}>
      <span style={styles.cardTag}>本周任务</span>
      {weekNumber && year && <h1 style={styles.cardWeek}>第{weekNumber}周</h1>}
      <p style={styles.emptyHint}>你想在这一周<br />推进什么重要的事？</p>
      <button style={styles.setMissionBtn} onClick={onSetMission}>+ 设定本周使命</button>
    </div>
  );
}

// ─── Calendar Views ────────────────────────────────────────────────────────────

function CalendarView({
  period,
  weeklyReport,
}: {
  period: PeriodTab;
  weeklyReport: WeeklyReport | null;
}) {
  return (
    <div style={styles.calendarWrap}>
      {period === 'week' && <WeekView weeklyReport={weeklyReport} />}
      {period === 'month' && <MonthView />}
      {period === 'year' && <YearView />}
    </div>
  );
}

function WeekView({ weeklyReport }: { weeklyReport: WeeklyReport | null }) {
  const today = new Date();
  const todayStr = formatDate(today);
  const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  // Build 7-day array starting from this Monday
  const monday = getMondayOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Map date → completionRate from weeklyReport
  const completionMap: Record<string, number> = {};
  if (weeklyReport) {
    for (const s of weeklyReport.stats) {
      completionMap[s.date] = s.completionRate;
    }
  }

  return (
    <div style={styles.weekRow}>
      {days.map((d, i) => {
        const ds = formatDate(d);
        const isToday = ds === todayStr;
        const hasActivity = (completionMap[ds] ?? 0) > 0;
        return (
          <div key={ds} style={styles.weekDayCol}>
            <span style={styles.weekDayLabel}>{DAY_LABELS[i]}</span>
            <div
              style={{
                ...styles.weekDayCircle,
                ...(isToday ? styles.weekDayCircleToday : {}),
              }}
            >
              <span
                style={{
                  ...styles.weekDayNum,
                  ...(isToday ? styles.weekDayNumToday : {}),
                }}
              >
                {d.getDate()}
              </span>
            </div>
            {hasActivity && (
              <div style={{ ...styles.dot, ...styles.activityDot }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView() {
  const today = new Date();
  const todayStr = formatDate(today);
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  // Monday-based offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div style={styles.monthGrid}>
      {DAY_LABELS.map((l) => (
        <div key={l} style={styles.monthHeaderCell}>{l}</div>
      ))}
      {cells.map((day, i) => {
        if (!day) return <div key={i} style={styles.monthCell} />;
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = ds === todayStr;
        return (
          <div key={i} style={styles.monthCell}>
            <div style={{ ...styles.monthDayCircle, ...(isToday ? styles.monthDayCircleToday : {}) }}>
              <span style={{ ...styles.monthDayNum, ...(isToday ? styles.monthDayNumToday : {}) }}>
                {day}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearView() {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-based
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);

  return (
    <div style={styles.yearGrid}>
      {MONTHS.map((label, i) => {
        const isCurrentMonth = i === currentMonth;
        const isFocused = focusedMonth === i;
        return (
          <button
            key={i}
            style={{
              ...styles.yearMonthCell,
              ...(isCurrentMonth ? styles.yearMonthCellActive : {}),
              ...(isFocused ? styles.yearMonthCellFocused : {}),
            }}
            onClick={() => setFocusedMonth(isFocused ? null : i)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100%',
    background: 'var(--color-bg-base)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-xl) var(--spacing-lg) var(--spacing-md)',
  },
  headerTitle: {
    fontSize: '34px',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.5px',
    color: 'var(--color-text-primary)',
  },
  pageIndicators: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    display: 'block' as const,
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-text-muted)',
    opacity: 0.35,
  },
  dotActive: {
    opacity: 1,
    background: 'var(--color-text-primary)',
  },
  main: {
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-lg) var(--spacing-lg)',
  },
  card: {
    background: 'var(--color-bg-card-dark)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-xs)',
  },
  emptyCard: {
    background: 'var(--color-bg-card-dark)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-sm)',
    minHeight: '280px',
  },
  skeletonTag: {
    width: '64px',
    height: '12px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.12)',
  },
  skeletonWeek: {
    width: '120px',
    height: '48px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    marginTop: 'var(--spacing-xs)',
  },
  skeletonLine: {
    width: '80%',
    height: '16px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.08)',
  },
  errorText: {
    margin: 0,
    marginTop: 'var(--spacing-sm)',
    fontSize: '16px',
    color: 'rgba(255,255,255,0.7)',
  },
  retryBtn: {
    marginTop: 'auto',
    padding: '12px var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    alignSelf: 'flex-start' as const,
  },
  cardTag: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  cardWeek: {
    margin: 0,
    fontSize: '48px',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-2px',
    color: 'var(--color-text-inverse)',
    marginTop: 'var(--spacing-xs)',
  },
  missionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    cursor: 'pointer',
    marginTop: 'var(--spacing-xs)',
    WebkitTapHighlightColor: 'transparent',
  },
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    lineHeight: '24px',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  editHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
  },
  cardDesc: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '20px',
    color: 'rgba(255,255,255,0.5)',
  },
  periodTabs: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    marginTop: 'var(--spacing-md)',
  },
  periodTab: {
    padding: '6px 16px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--duration-fast) var(--easing-default)',
  },
  periodTabActive: {
    background: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
    color: 'var(--color-text-inverse)',
  },
  // Calendar container
  calendarWrap: {
    marginTop: 'var(--spacing-md)',
    animation: 'fadeIn var(--duration-fast) ease',
  },
  // Week view
  weekRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
  },
  weekDayCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  weekDayLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 500,
  },
  weekDayCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleToday: {
    background: 'rgba(255,255,255,0.95)',
  },
  weekDayNum: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
  },
  weekDayNumToday: {
    color: '#000',
    fontWeight: 700,
  },
  activityDot: {
    width: '4px',
    height: '4px',
    background: '#4CAF50',
    opacity: 1,
    flexShrink: 0,
  },
  // Month view
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  },
  monthHeaderCell: {
    textAlign: 'center' as const,
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    fontWeight: 500,
    paddingBottom: '6px',
  },
  monthCell: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: '1',
  },
  monthDayCircle: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayCircleToday: {
    background: 'rgba(255,255,255,0.95)',
  },
  monthDayNum: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.65)',
  },
  monthDayNumToday: {
    color: '#000',
    fontWeight: 700,
  },
  // Year view
  yearGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 'var(--spacing-xs)',
  },
  yearMonthCell: {
    padding: '10px 4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all var(--duration-fast) var(--easing-default)',
  },
  yearMonthCellActive: {
    background: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.5)',
    color: 'var(--color-text-inverse)',
    fontWeight: 700,
  },
  yearMonthCellFocused: {
    background: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  emptyHint: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: '30px',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 'var(--spacing-xs)',
  },
  setMissionBtn: {
    marginTop: 'auto',
    padding: '14px var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-text-inverse)',
    color: 'var(--color-text-primary)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Input modal
  inputOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 200,
  },
  inputSheet: {
    width: '100%',
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-modal) var(--radius-modal) 0 0',
    padding: 'var(--spacing-lg)',
    paddingBottom: 'calc(var(--spacing-lg) + env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-md)',
  },
  inputLabel: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  input: {
    width: '100%',
    padding: '12px var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-input)',
    fontSize: '16px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputActions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-primary)',
    color: 'var(--color-text-inverse)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity var(--duration-fast) var(--easing-default)',
  },
} as const;
