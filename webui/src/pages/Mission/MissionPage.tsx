import { useEffect, useState } from 'react';

type PeriodTab = 'week' | 'month' | 'year';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  weekNumber: number;
  year: number;
  status: string;
}

interface CurrentMissionResponse {
  traceId: string;
  weekNumber: number;
  year: number;
  mission: Mission | null;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export default function MissionPage() {
  const [data, setData] = useState<CurrentMissionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<PeriodTab>('week');
  const [showInput, setShowInput] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchMission();
  }, []);

  async function fetchMission() {
    try {
      const res = await fetch(`${API_BASE}/api/mission/current?userId=default`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CurrentMissionResponse;
      setData(json);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveMission() {
    if (!inputTitle.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default', title: inputTitle.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInputTitle('');
      setShowInput(false);
      // Reload
      setIsLoading(true);
      await fetchMission();
    } finally {
      setIsSaving(false);
    }
  }

  const pageIndicators = [true, false, false, false];

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <span style={styles.headerTitle}>Mission</span>
        <div style={styles.pageIndicators}>
          {pageIndicators.map((active, i) => (
            <span key={i} style={{ ...styles.dot, ...(active ? styles.dotActive : {}) }} />
          ))}
        </div>
      </header>

      {/* Main card area */}
      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.loadingCard}>
            <span style={styles.loadingText}>加载中…</span>
          </div>
        ) : data?.mission ? (
          <MissionCard
            mission={data.mission}
            activePeriod={activePeriod}
            onPeriodChange={setActivePeriod}
          />
        ) : (
          <EmptyCard
            weekNumber={data?.weekNumber}
            year={data?.year}
            onSetMission={() => setShowInput(true)}
          />
        )}
      </main>

      {/* Inline input modal */}
      {showInput && (
        <div style={styles.inputOverlay} onClick={() => setShowInput(false)}>
          <div style={styles.inputSheet} onClick={(e) => e.stopPropagation()}>
            <p style={styles.inputLabel}>设定本周使命</p>
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
              <button style={styles.cancelBtn} onClick={() => setShowInput(false)}>
                取消
              </button>
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

function MissionCard({
  mission,
  activePeriod,
  onPeriodChange,
}: {
  mission: Mission;
  activePeriod: PeriodTab;
  onPeriodChange: (p: PeriodTab) => void;
}) {
  const PERIOD_TABS: { key: PeriodTab; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  return (
    <div style={styles.card}>
      <span style={styles.cardTag}>本周任务</span>
      <h1 style={styles.cardWeek}>第{mission.weekNumber}周</h1>
      <p style={styles.cardTitle}>{mission.title}</p>
      {mission.description && (
        <p style={styles.cardDesc}>{mission.description}</p>
      )}
      <div style={styles.periodTabs}>
        {PERIOD_TABS.map((t) => (
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
      {weekNumber && year && (
        <h1 style={styles.cardWeek}>第{weekNumber}周</h1>
      )}
      <p style={styles.emptyHint}>
        你想在这一周<br />推进什么重要的事？
      </p>
      <button style={styles.setMissionBtn} onClick={onSetMission}>
        + 设定本周使命
      </button>
    </div>
  );
}

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
  loadingCard: {
    background: 'var(--color-bg-card-dark)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-xl)',
    minHeight: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '15px',
  },
  card: {
    background: 'var(--color-bg-card-dark)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-xs)',
    minHeight: '280px',
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
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    lineHeight: '24px',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 'var(--spacing-xs)',
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
    marginTop: 'auto',
    paddingTop: 'var(--spacing-lg)',
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
    transition: 'opacity var(--duration-fast) var(--easing-default)',
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
