interface BuzzeLogoProps {
  size?: number;
  className?: string;
}

export function BuzzeLogo({ size = 28, className }: BuzzeLogoProps) {
  const iconSz = Math.round(size * 1.55);
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      <svg width={iconSz} height={iconSz} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bzLogo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#bzLogo)" />
        <path d="M24 5L13 22h10L16 35 31 17H21L29 5z" fill="white" fillOpacity="0.95" />
      </svg>
      <span
        style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 800,
          fontSize: size * 0.75,
          letterSpacing: '-0.03em',
          color: '#f0ecff',
          lineHeight: 1,
        }}
      >
        buzze<span style={{ color: '#c084fc' }}>.io</span>
      </span>
    </div>
  );
}
