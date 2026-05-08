interface PlayerAvatarProps {
  name: string;
  color: string;
  size?: number;
  textColor?: string;
  className?: string;
}

export function PlayerAvatar({
  name,
  color,
  size = 32,
  textColor = '#07060f',
  className = '',
}: PlayerAvatarProps) {
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center rounded-full font-display font-bold ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        fontSize: Math.round(size * 0.43),
        lineHeight: 1,
        boxShadow: `0 0 8px ${color}55`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
