import { useEffect, useRef, useState } from 'react';
import { db, type FocusSession } from '../../bridge/db';

const DEFAULT_DURATION_SECONDS = 25 * 60;

type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';

interface FocusPageProps {
  onFocusStateChange?: (isActive: boolean) => void;
}

export default function FocusPage({ onFocusStateChange }: FocusPageProps) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATION_SECONDS);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startError, setStartError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume active session on mount
  useEffect(() => {
    void fetchActiveSession();
  }, []);

  useEffect(() => {
    onFocusStateChange?.(sessionStatus === 'running' || sessionStatus === 'paused');
  }, [sessionStatus, onFocusStateChange]);

  useEffect(() => {
    if (sessionStatus === 'running') {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setSessionStatus('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionStatus]);

  async function fetchActiveSession() {
    try {
      const session = await db.focus.getActive();
      if (session) {
        setActiveSession(session);
        const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, DEFAULT_DURATION_SECONDS - elapsed);
        setSecondsLeft(remaining);
        setSessionStatus(remaining > 0 ? 'running' : 'finished');
      }
    } catch {
      // Non-critical — silently ignore
    }
  }

  async function handleStart() {
    setStartError(false);
    setIsLoading(true);
    try {
      const session = await db.focus.start(DEFAULT_DURATION_SECONDS);
      setActiveSession(session);
      setSecondsLeft(DEFAULT_DURATION_SECONDS);
      setSessionStatus('running');
    } catch {
      setStartError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEnd() {
    if (!activeSession) {
      setSessionStatus('idle');
      setSecondsLeft(DEFAULT_DURATION_SECONDS);
      return;
    }

    const elapsed = DEFAULT_DURATION_SECONDS - secondsLeft;
    setIsLoading(true);
    try {
      await db.focus.end(activeSession.id, elapsed);
    } catch {
      // Best-effort
    } finally {
      setActiveSession(null);
      setSessionStatus('idle');
      setSecondsLeft(DEFAULT_DURATION_SECONDS);
      setIsLoading(false);
    }
  }

  function handlePause() {
    setSessionStatus(sessionStatus === 'running' ? 'paused' : 'running');
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const isFinished = sessionStatus === 'finished';
  const isIdle = sessionStatus === 'idle';
  const isActive = sessionStatus === 'running' || sessionStatus === 'paused';

  return (
    <div style={styles.page}>
      {/* Task label */}
      <div style={styles.taskLabel}>
        {isIdle ? (
          <input
            style={styles.taskInput}
            type="text"
            placeholder="今天专注在什么上？（可选）"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            maxLength={60}
          />
        ) : (
          <span style={styles.taskText}>{taskTitle || '专注中'}</span>
        )}
      </div>

      {/* Timer */}
      <div style={styles.timerWrapper}>
        <span
          style={{
            ...styles.timer,
            color: isFinished ? 'var(--color-primary)' : 'rgba(255,255,255,0.95)',
          }}
        >
          {minutes}:{seconds}
        </span>
        {isFinished && <p style={styles.finishedLabel}>专注完成 🎉</p>}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {isIdle && (
          <>
            <button
              style={{ ...styles.primaryBtn, opacity: isLoading ? 0.5 : 1 }}
              onClick={() => void handleStart()}
              disabled={isLoading}
            >
              开始专注
            </button>
            {startError && (
              <p style={styles.errorHint}>启动失败，请重试</p>
            )}
          </>
        )}

        {isActive && (
          <>
            <button style={styles.secondaryBtn} onClick={handlePause}>
              {sessionStatus === 'running' ? '暂停' : '继续'}
            </button>
            <button
              style={{ ...styles.ghostBtn, opacity: isLoading ? 0.5 : 1 }}
              onClick={handleEnd}
              disabled={isLoading}
            >
              结束
            </button>
          </>
        )}

        {isFinished && (
          <button
            style={{ ...styles.primaryBtn, opacity: isLoading ? 0.5 : 1 }}
            onClick={handleEnd}
            disabled={isLoading}
          >
            完成，返回
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100dvh',
    background: 'var(--color-bg-focus)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '48px',
    padding: 'var(--spacing-xl)',
    boxSizing: 'border-box' as const,
  },
  taskLabel: {
    width: '100%',
    maxWidth: '320px',
    textAlign: 'center' as const,
  },
  taskInput: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    outline: 'none',
    fontSize: '17px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center' as const,
    width: '100%',
    padding: '8px 0',
    caretColor: 'var(--color-primary)',
  },
  taskText: {
    fontSize: '17px',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.2px',
  },
  timerWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  timer: {
    fontSize: '96px',
    fontWeight: 200,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-4px',
    lineHeight: 1,
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    transition: 'color var(--duration-normal) var(--easing-ios)',
  },
  finishedLabel: {
    margin: 0,
    fontSize: '17px',
    color: 'var(--color-primary)',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '240px',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px 0',
    background: 'var(--color-primary)',
    color: 'var(--color-text-primary)',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    fontSize: '17px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity var(--duration-fast)',
  },
  secondaryBtn: {
    width: '100%',
    padding: '14px 0',
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.85)',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    fontSize: '17px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  ghostBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '15px',
    cursor: 'pointer',
    padding: '4px 0',
  },
  errorHint: {
    margin: 0,
    fontSize: '13px',
    color: 'rgba(255,100,100,0.85)',
    textAlign: 'center' as const,
  },
} as const;
