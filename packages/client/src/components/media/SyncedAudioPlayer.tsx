import { useCallback, useRef, useState } from 'react';

interface SyncedAudioPlayerProps {
  src: string;
  audioRef: (el: HTMLAudioElement | null) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
}

export function SyncedAudioPlayer({
  src,
  audioRef,
  onPlay,
  onPause,
  onSeeked,
}: SyncedAudioPlayerProps) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const combinedRef = useCallback((el: HTMLAudioElement | null) => {
    elRef.current = el;
    audioRef(el);
  }, [audioRef]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  function fmt(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div
      className="w-full rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <audio
        ref={combinedRef}
        src={src}
        onPlay={() => { setPlaying(true); onPlay(); }}
        onPause={() => { setPlaying(false); onPause(); }}
        onSeeked={onSeeked}
        onTimeUpdate={(event) => setCurrent((event.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(event) => setDuration((event.target as HTMLAudioElement).duration)}
      />
      <button
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{ background: 'rgba(124,58,237,0.8)' }}
        onMouseEnter={(event) => { (event.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
        onMouseLeave={(event) => { (event.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.8)'; }}
        onClick={() => { elRef.current?.paused ? elRef.current.play() : elRef.current?.pause(); }}
      >
        {playing
          ? <span style={{ color: '#fff', fontSize: 12 }}>||</span>
          : <span style={{ color: '#fff', fontSize: 13, paddingLeft: 2 }}>▶</span>}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#6b6390' }}>ÁUDIO DA DICA</span>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3558' }}>HOST SYNC</span>
        </div>
        <div
          className="relative w-full h-1 rounded-full cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={(event) => {
            if (!elRef.current || !duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            elRef.current.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: '#7c3aed' }} />
        </div>
        <span className="font-mono text-[10px]" style={{ color: '#6b6390' }}>
          {fmt(current)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
