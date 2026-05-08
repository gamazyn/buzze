interface TimerCircleProps {
  remainingMs: number;
  totalMs: number;
  isPaused: boolean;
}

export function TimerCircle({ remainingMs, totalMs, isPaused }: TimerCircleProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  const offset = circumference * (1 - fraction);
  const seconds = Math.ceil(remainingMs / 1000);
  const color = isPaused ? '#6b6390' : fraction > 0.4 ? '#c084fc' : fraction > 0.2 ? '#ffc857' : '#ff4d6d';

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#6b6390' }}>TIMER</span>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: isPaused ? 'none' : 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
        />
        <text
          x={36}
          y={41}
          textAnchor="middle"
          fill={color}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700 }}
        >
          {seconds}
        </text>
      </svg>
    </div>
  );
}
