import { useEffect, useState } from 'react';
import { db, type GrowthProfile } from '../../bridge/db';

const EXP_PER_LEVEL = 100;

interface Ability {
  key: string;
  name: string;
  level: number;
  exp: number;
  expToNext: number;
}

// --- SVG Radar Chart ---

const RADAR_SIZE = 280;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 100;
const GRID_LAYERS = 3;

function polarToCartesian(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}

interface RadarChartProps {
  abilities: Ability[];
}

function RadarChart({ abilities }: RadarChartProps) {
  const count = abilities.length;
  const angleStep = 360 / count;

  // Grid hexagons
  const gridLayers = Array.from({ length: GRID_LAYERS }, (_, i) => {
    const r = (RADIUS * (i + 1)) / GRID_LAYERS;
    const pts = abilities.map((_, idx) => polarToCartesian(idx * angleStep, r));
    return pointsToPath(pts);
  });

  // Data polygon — level normalised to 0–1 (max level 10)
  const dataPoints = abilities.map((a, idx) => {
    const ratio = Math.min((a.level - 1 + a.exp / EXP_PER_LEVEL) / 10, 1);
    return polarToCartesian(idx * angleStep, RADIUS * ratio);
  });
  const dataPath = pointsToPath(dataPoints);

  // Axis lines + labels
  const axes = abilities.map((a, idx) => {
    const angle = idx * angleStep;
    const tip = polarToCartesian(angle, RADIUS);
    const labelPos = polarToCartesian(angle, RADIUS + 26);
    return { ability: a, tip, labelPos };
  });

  return (
    <svg
      width={RADAR_SIZE}
      height={RADAR_SIZE}
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      style={{ overflow: 'visible' }}
    >
      {/* Grid layers */}
      {gridLayers.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={0.8}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {axes.map(({ tip }, idx) => (
        <line
          key={idx}
          x1={CENTER}
          y1={CENTER}
          x2={tip.x}
          y2={tip.y}
          stroke="var(--color-border)"
          strokeWidth={0.8}
          opacity={0.4}
        />
      ))}

      {/* Data polygon fill */}
      <path
        d={dataPath}
        fill="var(--color-text-primary)"
        fillOpacity={0.08}
        stroke="var(--color-text-primary)"
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />

      {/* Data points */}
      {dataPoints.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r={3} fill="var(--color-text-primary)" opacity={0.7} />
      ))}

      {/* Labels */}
      {axes.map(({ ability, labelPos }) => (
        <text
          key={ability.key}
          x={labelPos.x}
          y={labelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="var(--color-text-secondary)"
          fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        >
          <tspan x={labelPos.x} dy="-0.6em">{ability.name}</tspan>
          <tspan x={labelPos.x} dy="1.4em" fill="var(--color-text-muted)" fontSize={9}>
            Lv{ability.level}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

// --- Ability Card ---

interface AbilityCardProps {
  ability: Ability;
}

function AbilityCard({ ability }: AbilityCardProps) {
  const progressPct = Math.round((ability.exp / EXP_PER_LEVEL) * 100);
  const isMaxLevel = ability.level >= 10;

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={cardStyles.name}>{ability.name}</span>
        <span style={cardStyles.level}>Lv{ability.level}</span>
      </div>
      <div style={cardStyles.barTrack}>
        <div
          style={{
            ...cardStyles.barFill,
            width: isMaxLevel ? '100%' : `${progressPct}%`,
          }}
        />
      </div>
      <div style={cardStyles.expLabel}>
        {isMaxLevel ? 'MAX' : `${ability.exp} / ${EXP_PER_LEVEL} exp`}
      </div>
    </div>
  );
}

const cardStyles = {
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    border: '1px solid var(--color-border)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  level: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-overlay)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
  },
  barTrack: {
    height: '4px',
    background: 'var(--color-bg-overlay)',
    borderRadius: 'var(--radius-pill)',
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%',
    background: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-pill)',
    transition: 'width var(--duration-normal) var(--easing-ios)',
    opacity: 0.7,
  },
  expLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textAlign: 'right' as const,
  },
} as const;

const ABILITY_NAMES: Record<string, string> = {
  focus: '专注',
  execution: '执行',
  consistency: '一致性',
  clarity: '清晰',
  energy: '精力',
  reflection: '反思',
};

function bridgeProfileToAbilities(profile: GrowthProfile): Ability[] {
  const keys = ['focus', 'execution', 'consistency', 'clarity', 'energy', 'reflection'] as const;
  return keys.map((key) => {
    const raw = profile[key];
    const level = Math.floor(raw / EXP_PER_LEVEL) + 1;
    const exp = raw % EXP_PER_LEVEL;
    return { key, name: ABILITY_NAMES[key], level, exp, expToNext: EXP_PER_LEVEL - exp };
  });
}

// --- GrowthPage ---

interface GrowthPageData {
  abilities: Ability[];
}

export default function GrowthPage() {
  const [pageData, setPageData] = useState<GrowthPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const profile = await db.growth.getProfile();
      setPageData({ abilities: bridgeProfileToAbilities(profile) });
    } catch {
      // Non-critical — leave null, render empty state
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>能力成长</h1>

      {isLoading && <div style={styles.placeholder}>加载中…</div>}

      {!isLoading && pageData && (
        <>
          <div style={styles.radarWrapper}>
            <RadarChart abilities={pageData.abilities} />
          </div>

          <div style={styles.grid}>
            {pageData.abilities.map((a) => (
              <AbilityCard key={a.key} ability={a} />
            ))}
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
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    alignSelf: 'flex-start',
  },
  radarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    padding: 'var(--spacing-md) 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-sm)',
    width: '100%',
  },
  placeholder: {
    color: 'var(--color-text-muted)',
    fontSize: '15px',
    marginTop: 'var(--spacing-xl)',
  },
} as const;
