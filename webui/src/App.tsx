import React, { useState, useCallback } from 'react';
import { callNative, isNativeEnv } from './bridge/native';

function haptic(style: 'light' | 'medium') {
  if (!isNativeEnv()) return;
  void callNative('haptic', { style });
}
import MissionPage from './pages/Mission/MissionPage';
import RitualPage from './pages/Ritual/RitualPage';
import FocusPage from './pages/Focus/FocusPage';
import GrowthPage from './pages/Growth/GrowthPage';
import ProgressPage from './pages/Progress/ProgressPage';

type TabId = 'mission' | 'ritual' | 'focus' | 'growth' | 'progress';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'mission',
    label: '使命',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 4h10l-2 3 2 3H3V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <line x1="3" y1="4" x2="3" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'ritual',
    label: '仪式',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="3" y="9.25" width="14" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="3" y="13.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'focus',
    label: '专注',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
        <line x1="10" y1="3" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'growth',
    label: '成长',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2.5 4.5H17l-3.5 3 1.5 5L10 12l-5 2.5 1.5-5L3 6.5h4.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: '回顾',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="12" width="3" height="5" rx="1" fill="currentColor" />
        <rect x="8.5" y="8" width="3" height="9" rx="1" fill="currentColor" />
        <rect x="14" y="4" width="3" height="13" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mission');
  const [isFocusActive, setIsFocusActive] = useState(false);

  const handleFocusStateChange = useCallback((isActive: boolean) => {
    setIsFocusActive(isActive);
  }, []);

  const hideTabBar = isFocusActive && activeTab === 'focus';

  return (
    <div style={styles.root}>
      <div style={{ ...styles.pageArea, paddingBottom: hideTabBar ? '0' : 'calc(60px + env(safe-area-inset-bottom))' }}>
        {activeTab === 'mission'  && <MissionPage />}
        {activeTab === 'ritual'   && <RitualPage />}
        {activeTab === 'focus'    && <FocusPage onFocusStateChange={handleFocusStateChange} />}
        {activeTab === 'growth'   && <GrowthPage />}
        {activeTab === 'progress' && <ProgressPage />}
      </div>

      {!hideTabBar && (
        <nav style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { haptic('light'); setActiveTab(tab.id); }}
                style={{ ...styles.tabItem, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
              >
                <span style={{ ...styles.tabIcon, opacity: isActive ? 1 : 0.5 }}>{tab.icon}</span>
                <span style={{ ...styles.tabLabel, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100dvh',
    background: 'var(--color-bg-base)',
    position: 'relative' as const,
  },
  pageArea: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  tabBar: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 'calc(60px + env(safe-area-inset-bottom))',
    paddingBottom: 'env(safe-area-inset-bottom)',
    display: 'flex',
    background: 'var(--color-bg-base)',
    borderTop: '0.5px solid var(--color-border)',
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0 4px',
    transition: 'color var(--duration-fast) var(--easing-default)',
    WebkitTapHighlightColor: 'transparent',
  },
  tabIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  tabLabel: {
    fontSize: '10px',
    lineHeight: 1,
    letterSpacing: '0.2px',
  },
} as const;
