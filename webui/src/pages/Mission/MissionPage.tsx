import { useEffect, useState } from 'react';

type TabKey = 'week' | 'month' | 'year';

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
  const [activeTab, setActiveTab] = useState<TabKey>('week');

  useEffect(() => {
    const fetchMission = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/mission/current?userId=default`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CurrentMissionResponse;
        setData(json);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMission();
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.weekLabel}>
          {isLoading ? '—' : `第 ${data?.weekNumber} 周`}
        </span>
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.placeholder}>加载中…</div>
        ) : data?.mission ? (
          <MissionCard mission={data.mission} />
        ) : (
          <EmptyState weekNumber={data?.weekNumber} year={data?.year} />
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  return (
    <div style={styles.card}>
      <h1 style={styles.missionTitle}>{mission.title}</h1>
      {mission.description && (
        <p style={styles.missionDesc}>{mission.description}</p>
      )}
    </div>
  );
}

function EmptyState({ weekNumber, year }: { weekNumber?: number; year?: number }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>◎</div>
      <p style={styles.emptyTitle}>设定本周使命</p>
      <p style={styles.emptyHint}>
        {weekNumber && year ? `${year} 年 · 第 ${weekNumber} 周` : ''}
        &nbsp;你想在这一周推进什么重要的事？
      </p>
    </div>
  );
}

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
  ];

  return (
    <nav style={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          style={{
            ...styles.tabItem,
            ...(activeTab === tab.key ? styles.tabItemActive : {}),
          }}
        >
          {tab.label}
          {activeTab === tab.key && <span style={styles.tabDot} />}
        </button>
      ))}
    </nav>
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
    padding: 'var(--spacing-xl) var(--spacing-lg) var(--spacing-sm)',
  },
  weekLabel: {
    fontSize: '48px',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--color-text-primary)',
    letterSpacing: '-1px',
    display: 'block' as const,
  },
  main: {
    flex: 1,
    padding: 'var(--spacing-md) var(--spacing-lg)',
  },
  card: {
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-lg)',
  },
  missionTitle: {
    margin: 0,
    fontSize: '34px',
    fontWeight: 700,
    lineHeight: 1.1,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.5px',
  },
  missionDesc: {
    margin: 'var(--spacing-sm) 0 0',
    fontSize: '17px',
    lineHeight: '22px',
    color: 'var(--color-text-secondary)',
  },
  placeholder: {
    color: 'var(--color-text-muted)',
    fontSize: '17px',
    padding: 'var(--spacing-lg) 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl) var(--spacing-lg)',
    gap: 'var(--spacing-sm)',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '40px',
    color: 'var(--color-text-muted)',
    lineHeight: 1,
    marginBottom: 'var(--spacing-sm)',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  emptyHint: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '20px',
    color: 'var(--color-text-secondary)',
    maxWidth: '260px',
  },
  tabBar: {
    display: 'flex',
    borderTop: '0.5px solid var(--color-separator)',
    background: 'var(--color-bg-base)',
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: 'var(--spacing-sm) 0 var(--spacing-xs)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--color-text-muted)',
    transition: 'color var(--duration-fast) var(--easing-default)',
  },
  tabItemActive: {
    color: 'var(--color-text-primary)',
    fontWeight: 600,
  },
  tabDot: {
    display: 'block' as const,
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
  },
} as const;
