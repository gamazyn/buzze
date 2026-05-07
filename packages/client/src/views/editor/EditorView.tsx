import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BuzzeLogo } from '../../components/ui/BuzzeLogo.js';
const randomUUID = () => crypto.randomUUID();
import type { GameConfig, Category, Question, MediaAsset } from '@buzze/shared';

const DEFAULT_VALUES = [100, 200, 300, 400, 500];
const FINAL_IDX = -1;

const TYPE_META: Record<Question['type'], { labelKey: string; color: string; bg: string }> = {
  standard:  { labelKey: 'editor.type_normal',    color: '#6b6390', bg: 'rgba(107,99,144,0.1)'  },
  all_play:  { labelKey: 'editor.type_all_play',  color: '#ffc857', bg: 'rgba(255,200,87,0.1)'  },
  challenge: { labelKey: 'editor.type_challenge', color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  double:      { labelKey: 'editor.type_double',      color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  speed_round: { labelKey: 'editor.type_speed_round', color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
};

function emptyQuestion(value: number): Question {
  return { id: randomUUID(), value, clue: '', answer: '', type: 'standard', used: false };
}
function emptyCategory(): Category {
  return { id: randomUUID(), name: '', questions: DEFAULT_VALUES.map(emptyQuestion) };
}
function emptyGame(): Omit<GameConfig, 'id' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    description: '',
    categories: [emptyCategory(), emptyCategory(), emptyCategory(), emptyCategory(), emptyCategory()],
    defaultTimer: 60,
    finalChallengeEnabled: true,
    finalChallengeClue: '',
    finalChallengeAnswer: '',
  };
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  }

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setCurrentTime(el.currentTime);
    setProgress((el.currentTime / el.duration) * 100);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration;
  }

  function fmt(t: number) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'linear-gradient(135deg, #15122a 0%, #0d0b18 100%)',
      border: '1px solid rgba(124,58,237,0.35)',
      borderRadius: 10, padding: '8px 12px',
      minWidth: 220, maxWidth: 300,
    }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: playing ? 'rgba(124,58,237,0.25)' : 'linear-gradient(135deg, #7c3aed, #c084fc)',
          border: playing ? '1px solid rgba(192,132,252,0.5)' : 'none',
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', transition: 'all 0.15s',
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={handleSeek}
          style={{ height: 4, background: '#07060f', borderRadius: 2, cursor: 'pointer', marginBottom: 5, overflow: 'hidden' }}
        >
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #c084fc)',
            borderRadius: 2, transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.05em' }}>
            {fmt(currentTime)}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3a3558', letterSpacing: '0.05em' }}>
            {fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Media Upload ──────────────────────────────────────────────────────────────
interface MediaUploadProps {
  gameId: string;
  media?: MediaAsset;
  label?: string;
  accept?: string;
  onUpload: (asset: MediaAsset) => void;
  onRemove: () => void;
}

function MediaUpload({ gameId, media, label = '+ Mídia', accept = 'image/*,audio/*', onUpload, onRemove }: MediaUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (media) {
      await fetch(`/api/games/${gameId}/media/${media.filename}`, { method: 'DELETE' }).catch(() => {});
    }
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/games/${gameId}/media`, { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error ?? 'Erro ao enviar');
      } else {
        const { filename, type } = await res.json();
        onUpload({ type: type as MediaAsset['type'], filename });
      }
    } catch {
      setUploadError('Erro ao enviar');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    if (!media) return;
    await fetch(`/api/games/${gameId}/media/${media.filename}`, { method: 'DELETE' }).catch(() => {});
    onRemove();
  }

  if (media) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {media.type === 'audio' ? (
          <AudioPlayer src={`/media/${gameId}/${media.filename}`} />
        ) : (
          <img
            src={`/media/${gameId}/${media.filename}`}
            alt=""
            style={{ height: 48, width: 'auto', borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(124,58,237,0.3)' }}
          />
        )}
        <label style={{
          cursor: 'pointer', fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace', color: '#c084fc',
          border: '1px solid rgba(192,132,252,0.35)', borderRadius: 7,
          padding: '4px 10px', transition: 'all 0.15s',
          letterSpacing: '0.05em',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {uploading ? '...' : t('editor.change')}
          <input type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        </label>
        <button
          type="button"
          onClick={handleRemove}
          style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.3)',
            borderRadius: 7, padding: '4px 10px', background: 'transparent',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          ✕
        </button>
        {uploadError && <span style={{ color: '#ff4d6d', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>{uploadError}</span>}
      </div>
    );
  }

  return (
    <div>
      <label style={{
        cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6390',
        border: '1px dashed rgba(124,58,237,0.25)', background: '#0d0b18',
        borderRadius: 8, padding: '7px 14px',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(192,132,252,0.5)';
          el.style.color = '#c084fc';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(124,58,237,0.25)';
          el.style.color = '#6b6390';
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        {uploading ? 'Enviando...' : label}
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
      {uploadError && <span style={{ color: '#ff4d6d', fontSize: 11, display: 'block', marginTop: 4 }}>{uploadError}</span>}
    </div>
  );
}

// ── Mono section label ────────────────────────────────────────────────────────
function FieldLabel({ color = '#6b6390', children }: { color?: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
      color, userSelect: 'none',
    }}>
      {children}
    </span>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export function EditorView() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId?: string }>();
  const { t } = useTranslation();
  const [game, setGame] = useState<ReturnType<typeof emptyGame>>(emptyGame());
  const [selectedCat, setSelectedCat] = useState(0);
  const [selectedQ, setSelectedQ] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameId) {
      fetch(`/api/games/${gameId}`)
        .then((r) => r.json())
        .then((data: GameConfig) => {
          setGame({
            name: data.name,
            description: data.description ?? '',
            categories: data.categories,
            defaultTimer: data.defaultTimer,
            finalChallengeEnabled: data.finalChallengeEnabled,
            finalChallengeClue: data.finalChallengeClue,
            finalChallengeAnswer: data.finalChallengeAnswer,
            finalChallengeMedia: data.finalChallengeMedia,
          });
        })
        .catch(() => setError('Erro ao carregar jogo'));
    }
  }, [gameId]);

  function updateCategory(idx: number, update: Partial<Category>) {
    setGame((g) => ({ ...g, categories: g.categories.map((c, i) => (i === idx ? { ...c, ...update } : c)) }));
  }

  function updateQuestion(catIdx: number, qIdx: number, update: Partial<Question>) {
    setGame((g) => ({
      ...g,
      categories: g.categories.map((c, ci) =>
        ci !== catIdx ? c : { ...c, questions: c.questions.map((q, qi) => (qi !== qIdx ? q : { ...q, ...update })) },
      ),
    }));
  }

  function addCategory() {
    setGame((g) => ({ ...g, categories: [...g.categories, emptyCategory()] }));
    setSelectedCat(game.categories.length);
    setSelectedQ(0);
  }

  function removeCategory(idx: number) {
    if (game.categories.length <= 1) return;
    setGame((g) => ({ ...g, categories: g.categories.filter((_, i) => i !== idx) }));
    setSelectedCat((c) => Math.min(c, game.categories.length - 2));
    setSelectedQ(0);
  }

  function addQuestion(catIdx: number) {
    setGame((g) => {
      const cat = g.categories[catIdx];
      if (cat.questions.length >= 10) return g;
      const lastValue = cat.questions[cat.questions.length - 1]?.value ?? 0;
      return {
        ...g,
        categories: g.categories.map((c, i) =>
          i === catIdx ? { ...c, questions: [...c.questions, emptyQuestion(lastValue + 100)] } : c,
        ),
      };
    });
    setSelectedQ(game.categories[catIdx].questions.length);
  }

  function removeQuestion(catIdx: number, qIdx: number) {
    setGame((g) => {
      const cat = g.categories[catIdx];
      if (cat.questions.length <= 1) return g;
      return {
        ...g,
        categories: g.categories.map((c, i) =>
          i === catIdx ? { ...c, questions: c.questions.filter((_, qi) => qi !== qIdx) } : c,
        ),
      };
    });
    setSelectedQ((q) => Math.min(q, game.categories[catIdx].questions.length - 2));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const url = gameId ? `/api/games/${gameId}` : '/api/games';
      const method = gameId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erro ao salvar');
      } else if (!gameId) {
        const created: GameConfig = await res.json();
        navigate(`/editor/${created.id}`);
      } else {
        navigate('/host');
      }
    } catch {
      setError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const isFinal = selectedCat === FINAL_IDX;
  const cat = isFinal ? null : game.categories[selectedCat];
  const q = cat?.questions[selectedQ];
  const qMeta = q ? TYPE_META[q.type] : null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#07060f' }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 56,
        background: 'rgba(7,6,15,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'relative', zIndex: 10,
      }}>
        <BuzzeLogo size={18} />
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
        <button
          onClick={() => navigate('/host')}
          style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c084fc',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(192,132,252,0.3)',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.2)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.3)';
          }}
        >
          {t('editor.back')}
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        <input
          type="text"
          placeholder={t('editor.game_name')}
          value={game.name}
          onChange={(e) => setGame((g) => ({ ...g, name: e.target.value }))}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
            fontSize: 16, color: '#f0ecff', caretColor: '#c084fc',
            letterSpacing: '-0.01em', minWidth: 0,
          }}
        />

        {error && (
          <p style={{ color: '#ff4d6d', fontSize: 11, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>{error}</p>
        )}
        {!gameId && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6b6390', flexShrink: 0 }}>
            💡 Salve para adicionar mídia
          </span>
        )}
        <button
          onClick={save}
          disabled={saving || !game.name.trim()}
          style={{
            flexShrink: 0, padding: '7px 20px', borderRadius: 9,
            background: saving || !game.name.trim()
              ? 'rgba(124,58,237,0.25)'
              : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none', cursor: saving || !game.name.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 13,
            color: saving || !game.name.trim() ? '#6b6390' : '#fff',
            letterSpacing: '0.02em', transition: 'all 0.15s',
          }}
        >
          {saving ? t('editor.saving') : gameId ? `✓ ${t('editor.save')}` : 'Criar →'}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 10 }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
        <div style={{
          width: 208, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0d0b18', borderRight: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          {/* Categories */}
          <div style={{ flexShrink: 0, padding: '14px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <FieldLabel>{t('editor.categories_label')}</FieldLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {game.categories.map((c, i) => {
                const active = selectedCat === i;
                return (
                  <div key={c.id} style={{ position: 'relative' }} className="group">
                    <button
                      onClick={() => { setSelectedCat(i); setSelectedQ(0); }}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '8px 28px 8px 10px',
                        borderRadius: 9,
                        background: active ? 'linear-gradient(160deg, #1e1a38, #15122a)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(192,132,252,0.4)' : 'transparent'}`,
                        borderLeft: `2px solid ${active ? '#c084fc' : 'transparent'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: active ? 700 : 400,
                        color: active ? '#e2d9ff' : '#6b6390',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#6b6390'; }}
                    >
                      {c.name || `Categoria ${i + 1}`}
                    </button>
                    {game.categories.length > 1 && (
                      <button
                        onClick={() => removeCategory(i)}
                        style={{
                          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                          width: 18, height: 18, borderRadius: 5,
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#3a3558', fontSize: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: 0, transition: 'all 0.15s',
                        }}
                        className="group-hover:opacity-100"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff4d6d'; (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3a3558'; }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={addCategory}
                style={{
                  padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
                  border: '1px dashed rgba(124,58,237,0.2)', background: 'transparent',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#3a3558',
                  transition: 'all 0.15s', marginTop: 2,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(192,132,252,0.4)';
                  el.style.color = '#c084fc';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(124,58,237,0.2)';
                  el.style.color = '#3a3558';
                }}
              >
                {t('editor.add_category')}
              </button>
            </div>
          </div>

          {/* Questions */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FieldLabel>{t('editor.questions_label')}</FieldLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {cat?.questions.map((qItem, qi) => {
                const isActive = !isFinal && selectedQ === qi;
                const meta = TYPE_META[qItem.type];
                return (
                  <button
                    key={qItem.id}
                    onClick={() => setSelectedQ(qi)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '9px 10px', borderRadius: 10,
                      background: isActive ? 'linear-gradient(160deg, #1e1a38, #15122a)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      borderLeft: `2px solid ${isActive ? '#c084fc' : 'transparent'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 9,
                    }}
                  >
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 12,
                      color: isActive ? '#c084fc' : '#3a3558',
                      flexShrink: 0, width: 36, textAlign: 'right',
                      textShadow: isActive ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                      ${qItem.value}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                        color: isActive ? '#c4b5fd' : '#4a4570',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        margin: 0, lineHeight: 1.4,
                      }}>
                        {qItem.clue || <em style={{ color: '#2a2545' }}>sem clue</em>}
                      </p>
                      {qItem.type !== 'standard' && (
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                          fontWeight: 700, color: meta.color, letterSpacing: '0.08em',
                        }}>
                          {t(meta.labelKey).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {cat && cat.questions.length < 10 && (
                <button
                  onClick={() => addQuestion(selectedCat)}
                  style={{
                    padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
                    border: '1px dashed rgba(124,58,237,0.2)', background: 'transparent',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#3a3558',
                    transition: 'all 0.15s', marginTop: 2,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(192,132,252,0.4)';
                    el.style.color = '#c084fc';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(124,58,237,0.2)';
                    el.style.color = '#3a3558';
                  }}
                >
                  {t('editor.add_question')}
                </button>
              )}
            </div>
          </div>

          {/* Desafio Final entry */}
          <div style={{ flexShrink: 0, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setSelectedCat(FINAL_IDX)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 10,
                background: isFinal ? 'linear-gradient(160deg, #1e1a38, #15122a)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isFinal ? 'rgba(192,132,252,0.4)' : 'rgba(255,255,255,0.04)'}`,
                borderLeft: `2px solid ${isFinal ? '#c084fc' : 'rgba(255,255,255,0.04)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 9,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>🏆</span>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontFamily: 'Syne, system-ui, sans-serif', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
                  color: isFinal ? '#c084fc' : '#3a3558', lineHeight: 1,
                }}>
                  {t('editor.final_challenge')}
                </p>
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                  color: game.finalChallengeEnabled ? '#3ee67a' : '#3a3558',
                  margin: '3px 0 0', letterSpacing: '0.08em',
                }}>
                  {game.finalChallengeEnabled ? t('editor.enabled').toUpperCase() : t('editor.disabled').toUpperCase()}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>

          {/* Normal category editor */}
          {cat && !isFinal && (
            <>
              {/* Category header */}
              <div style={{
                flexShrink: 0, padding: '28px 36px 22px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ marginBottom: 6 }}>
                  <FieldLabel color="#6b6390">◆ {t('editor.category_label').toUpperCase()}</FieldLabel>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder={t('editor.category_placeholder').toUpperCase()}
                    value={cat.name}
                    onChange={(e) => updateCategory(selectedCat, { name: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      outline: 'none', caretColor: '#c084fc',
                      fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800,
                      fontSize: 22, color: '#f0ecff',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3a3558', flexShrink: 0 }}>
                    {selectedQ + 1} / {cat.questions.length}
                  </span>
                  {gameId && (
                    <MediaUpload
                      gameId={gameId}
                      media={cat.media}
                      label="+ Header"
                      onUpload={(asset) => updateCategory(selectedCat, { media: asset })}
                      onRemove={() => updateCategory(selectedCat, { media: undefined })}
                    />
                  )}
                </div>
                <input
                  type="text"
                  placeholder={t('editor.description_placeholder')}
                  value={game.description}
                  onChange={(e) => setGame((g) => ({ ...g, description: e.target.value }))}
                  maxLength={500}
                  style={{
                    width: '100%', background: 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    outline: 'none', caretColor: '#c084fc',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390',
                    padding: '6px 0',
                  }}
                />
              </div>

              {/* Question fields */}
              {q && (
                <div style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {/* Clue */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FieldLabel color="#c084fc">◆ {t('editor.clue_label').toUpperCase()}</FieldLabel>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3558' }}>
                        {t('editor.clue_hint')}
                      </span>
                    </div>
                    <textarea
                      placeholder={t('editor.clue_placeholder')}
                      value={q.clue}
                      onChange={(e) => updateQuestion(selectedCat, selectedQ, { clue: e.target.value })}
                      rows={4}
                      style={{
                        width: '100%', background: '#0d0b18',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, outline: 'none', resize: 'vertical',
                        padding: '14px 16px', caretColor: '#c084fc',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 15,
                        color: '#f0ecff', lineHeight: 1.6,
                        transition: 'border-color 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(192,132,252,0.4)'; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    />
                    {gameId && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <FieldLabel>{t('editor.image_upload').toUpperCase()}</FieldLabel>
                          <MediaUpload gameId={gameId} media={q.media} label={`+ ${t('editor.image_upload')}`} accept="image/*"
                            onUpload={(asset) => updateQuestion(selectedCat, selectedQ, { media: asset })}
                            onRemove={() => updateQuestion(selectedCat, selectedQ, { media: undefined })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <FieldLabel>{t('editor.audio_upload').toUpperCase()}</FieldLabel>
                          <MediaUpload gameId={gameId} media={q.clueAudio} label={`+ ${t('editor.audio_upload')}`} accept="audio/*"
                            onUpload={(asset) => updateQuestion(selectedCat, selectedQ, { clueAudio: asset })}
                            onRemove={() => updateQuestion(selectedCat, selectedQ, { clueAudio: undefined })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Answer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FieldLabel color="#6b6390">◆ {t('editor.answer_label').toUpperCase()}</FieldLabel>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3558' }}>
                        {t('editor.answer_hint')}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={t('editor.answer_placeholder')}
                      value={q.answer}
                      onChange={(e) => updateQuestion(selectedCat, selectedQ, { answer: e.target.value })}
                      style={{
                        width: '100%', background: '#0d0b18',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10, outline: 'none',
                        padding: '11px 14px', caretColor: '#c084fc',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#a09bb8',
                        transition: 'border-color 0.15s', boxSizing: 'border-box',
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(107,99,144,0.5)'; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    />
                    {gameId && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <FieldLabel>{t('editor.image_upload').toUpperCase()}</FieldLabel>
                          <MediaUpload gameId={gameId} media={q.answerMedia} label={`+ ${t('editor.image_upload')}`} accept="image/*"
                            onUpload={(asset) => updateQuestion(selectedCat, selectedQ, { answerMedia: asset })}
                            onRemove={() => updateQuestion(selectedCat, selectedQ, { answerMedia: undefined })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <FieldLabel>{t('editor.audio_upload').toUpperCase()}</FieldLabel>
                          <MediaUpload gameId={gameId} media={q.answerAudio} label={`+ ${t('editor.audio_upload')}`} accept="audio/*"
                            onUpload={(asset) => updateQuestion(selectedCat, selectedQ, { answerAudio: asset })}
                            onRemove={() => updateQuestion(selectedCat, selectedQ, { answerAudio: undefined })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Challenge target */}
                  {q.type === 'challenge' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <FieldLabel color="#fb923c">◆ {t('editor.challenge_target_label').toUpperCase()}</FieldLabel>
                      <input
                        type="text"
                        placeholder={t('editor.challenge_target_placeholder')}
                        value={q.challengeTarget ?? ''}
                        onChange={(e) => updateQuestion(selectedCat, selectedQ, { challengeTarget: e.target.value || undefined })}
                        style={{
                          width: '100%', background: '#0d0b18',
                          border: '1px solid rgba(251,146,60,0.25)',
                          borderRadius: 10, outline: 'none',
                          padding: '11px 14px', caretColor: '#fb923c',
                          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#fb923c',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(251,146,60,0.5)'; }}
                        onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(251,146,60,0.25)'; }}
                      />
                    </div>
                  )}

                  {/* Navigation */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 20, marginTop: 'auto',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <button
                      disabled={selectedQ === 0}
                      onClick={() => setSelectedQ((q) => q - 1)}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                        padding: '8px 16px', borderRadius: 8,
                        color: '#6b6390', border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent', cursor: 'pointer',
                        opacity: selectedQ === 0 ? 0.3 : 1, transition: 'all 0.15s',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {t('editor.prev_question')}
                    </button>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {cat.questions.map((_, qi) => (
                        <button
                          key={qi}
                          onClick={() => setSelectedQ(qi)}
                          style={{
                            borderRadius: 10, border: 'none', cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: qi === selectedQ ? 20 : 8, height: 8,
                            background: qi === selectedQ ? '#7c3aed' : '#15122a',
                          }}
                        />
                      ))}
                    </div>
                    <button
                      disabled={selectedQ === cat.questions.length - 1}
                      onClick={() => setSelectedQ((q) => q + 1)}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                        padding: '8px 16px', borderRadius: 8,
                        color: '#6b6390', border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent', cursor: 'pointer',
                        opacity: selectedQ === cat.questions.length - 1 ? 0.3 : 1,
                        transition: 'all 0.15s', letterSpacing: '0.05em',
                      }}
                    >
                      {t('editor.next_question')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Desafio Final editor */}
          {isFinal && (
            <>
              <div style={{
                flexShrink: 0, padding: '28px 36px 22px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <FieldLabel color="#6b6390">◆ {t('editor.special_question').toUpperCase()}</FieldLabel>
                    <h2 style={{
                      fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800, fontSize: 24,
                      color: '#c084fc', letterSpacing: '0.06em', margin: '8px 0 0',
                      textShadow: '0 0 24px rgba(124,58,237,0.3)',
                    }}>
                      🏆 {t('editor.final_challenge').toUpperCase()}
                    </h2>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390' }}>
                      {game.finalChallengeEnabled ? t('editor.enabled') : t('editor.disabled')}
                    </span>
                    <div style={{
                      position: 'relative', width: 44, height: 24, borderRadius: 12,
                      background: game.finalChallengeEnabled ? '#7c3aed' : '#15122a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'background 0.2s',
                    }}>
                      <div style={{
                        position: 'absolute', top: 3, width: 16, height: 16,
                        background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        transform: game.finalChallengeEnabled ? 'translateX(24px)' : 'translateX(4px)',
                        transition: 'transform 0.2s',
                      }} />
                      <input
                        type="checkbox"
                        checked={game.finalChallengeEnabled}
                        onChange={(e) => setGame((g) => ({ ...g, finalChallengeEnabled: e.target.checked }))}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {game.finalChallengeEnabled && (
                <div style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FieldLabel color="#c084fc">◆ {t('editor.clue_label').toUpperCase()}</FieldLabel>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3558' }}>
                        {t('editor.clue_hint')}
                      </span>
                    </div>
                    <textarea
                      placeholder={t('editor.final_clue_placeholder')}
                      value={game.finalChallengeClue}
                      onChange={(e) => setGame((g) => ({ ...g, finalChallengeClue: e.target.value }))}
                      rows={4}
                      style={{
                        width: '100%', background: '#0d0b18',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, outline: 'none', resize: 'vertical',
                        padding: '14px 16px', caretColor: '#c084fc',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 15,
                        color: '#f0ecff', lineHeight: 1.6, boxSizing: 'border-box',
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(192,132,252,0.4)'; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    />
                    {gameId && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <FieldLabel>{t('editor.media_label')}</FieldLabel>
                        <MediaUpload
                          gameId={gameId}
                          media={game.finalChallengeMedia}
                          onUpload={(asset) => setGame((g) => ({ ...g, finalChallengeMedia: asset }))}
                          onRemove={() => setGame((g) => ({ ...g, finalChallengeMedia: undefined }))}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FieldLabel color="#6b6390">◆ {t('editor.answer_label').toUpperCase()}</FieldLabel>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3558' }}>
                        {t('editor.answer_hint')}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={t('editor.answer_placeholder')}
                      value={game.finalChallengeAnswer}
                      onChange={(e) => setGame((g) => ({ ...g, finalChallengeAnswer: e.target.value }))}
                      style={{
                        width: '100%', background: '#0d0b18',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10, outline: 'none',
                        padding: '11px 14px', caretColor: '#c084fc',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#a09bb8',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(107,99,144,0.5)'; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    />
                  </div>
                </div>
              )}

              {!game.finalChallengeEnabled && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3a3558' }}>
                    {t('editor.final_disabled_hint')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0d0b18', borderLeft: '1px solid rgba(255,255,255,0.07)',
          overflowY: 'auto',
        }}>
          {q && qMeta && !isFinal && (
            <>
              {/* Value */}
              <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <FieldLabel>{t('editor.value_label').toUpperCase()}</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 10 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 28,
                    color: '#c084fc', textShadow: '0 0 16px rgba(124,58,237,0.3)',
                  }}>$</span>
                  <input
                    type="number"
                    value={q.value}
                    onChange={(e) => updateQuestion(selectedCat, selectedQ, { value: Number(e.target.value) })}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 28,
                      color: '#c084fc', caretColor: '#c084fc', width: 80,
                    }}
                  />
                </div>
              </div>

              {/* Type */}
              <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <FieldLabel>{t('editor.type_label').toUpperCase()}</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                  {(Object.entries(TYPE_META) as [Question['type'], typeof TYPE_META[keyof typeof TYPE_META]][]).map(([type, meta]) => {
                    const active = q.type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => updateQuestion(selectedCat, selectedQ, { type })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          padding: '9px 12px', borderRadius: 10, textAlign: 'left',
                          background: active ? meta.bg : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${active ? meta.color + '50' : 'rgba(255,255,255,0.04)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: meta.color,
                          boxShadow: active ? `0 0 8px ${meta.color}` : 'none',
                          transition: 'box-shadow 0.15s',
                        }} />
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: active ? 700 : 400,
                          color: active ? meta.color : '#3a3558',
                          transition: 'color 0.15s',
                        }}>
                          {t(meta.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timer override */}
              <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <FieldLabel>TIMER</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="number"
                    placeholder={String(game.defaultTimer)}
                    value={q.timeOverride ?? ''}
                    onChange={(e) => updateQuestion(selectedCat, selectedQ, { timeOverride: e.target.value ? Number(e.target.value) : undefined })}
                    style={{
                      width: 64, background: '#07060f',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                      outline: 'none', padding: '7px 10px', textAlign: 'center',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f0ecff',
                      caretColor: '#c084fc',
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(192,132,252,0.4)'; }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#3a3558' }}>{t('editor.seconds')}</span>
                  {q.timeOverride && (
                    <button
                      onClick={() => updateQuestion(selectedCat, selectedQ, { timeOverride: undefined })}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6b6390',
                        background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff4d6d')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6b6390')}
                    >
                      {t('editor.timer_reset')}
                    </button>
                  )}
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3558', marginTop: 6 }}>
                  {t('editor.timer_default', { sec: game.defaultTimer })}
                </p>
              </div>
            </>
          )}

          {/* Default timer — always visible */}
          <div style={{ padding: '18px 16px' }}>
            <FieldLabel>TIMER PADRÃO</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <input
                type="number"
                value={game.defaultTimer}
                onChange={(e) => setGame((g) => ({ ...g, defaultTimer: Number(e.target.value) }))}
                style={{
                  width: 64, background: '#07060f',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                  outline: 'none', padding: '7px 10px', textAlign: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f0ecff',
                  caretColor: '#c084fc',
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(192,132,252,0.4)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#3a3558' }}>{t('editor.seconds')}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
