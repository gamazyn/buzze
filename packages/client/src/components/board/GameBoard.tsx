import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Category } from '@buzze/shared';

interface Props {
  categories: Category[];
  gameId?: string;
  onSelectQuestion?: (categoryId: string, questionId: string) => void;
  activeQuestionId?: string | null;
  fillHeight?: boolean;
}

function CategoryName({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const base = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];
  return (
    <span
      className="font-display uppercase text-xs md:text-sm leading-tight tracking-widest"
      style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
    >
      {base && <span style={{ color: '#6b6390' }}>{base} </span>}
      <span style={{ color: words.length > 1 ? '#c084fc' : '#6b6390' }}>{last}</span>
    </span>
  );
}

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  all_play:  { label: 'type_all_play',  bg: 'rgba(62,230,122,0.18)',  color: '#3ee67a' },
  challenge: { label: 'type_challenge', bg: 'rgba(255,200,87,0.18)',  color: '#ffc857' },
  double:    { label: 'type_double',    bg: 'rgba(124,58,237,0.28)',  color: '#c084fc' },
};

export function GameBoard({ categories, gameId, onSelectQuestion, activeQuestionId, fillHeight = false }: Props) {
  const { t } = useTranslation();
  const maxQuestions = Math.max(...categories.map((c) => c.questions.length));
  return (
    <div
      className={`grid gap-1 w-full ${fillHeight ? 'h-full' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
        ...(fillHeight ? { gridTemplateRows: `repeat(${maxQuestions + 1}, 1fr)` } : {}),
      }}
    >
      {/* Headers das categorias */}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`flex items-center justify-center text-center p-1 md:p-3 overflow-hidden ${fillHeight ? '' : 'min-h-[80px]'}`}
          style={{
            background: 'linear-gradient(180deg, #15122a 0%, #0d0b18 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 0 rgba(0,0,0,0.5)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {cat.media ? (
            <img src={`/media/${gameId}/${cat.media.filename}`} alt={cat.name} className="max-h-16 object-contain" />
          ) : (
            <CategoryName name={cat.name} />
          )}
        </div>
      ))}

      {/* Questões */}
      {(() => {
        return Array.from({ length: maxQuestions }, (_, rowIdx) =>
          categories.map((cat) => {
            const q = cat.questions[rowIdx];
            if (!q) return <div key={`${cat.id}-empty-${rowIdx}`} />;

            const isActive = q.id === activeQuestionId;

            return (
              <motion.div
                key={q.id}
                whileHover={!q.used ? { scale: 1.03 } : {}}
                whileTap={!q.used ? { scale: 0.97 } : {}}
                className={`question-cell relative ${fillHeight ? '' : 'aspect-[4/3]'} ${q.used ? 'used' : ''} ${
                  isActive ? 'ring-2 ring-buzze-violet' : ''
                }`}
                onClick={() => {
                  if (!q.used && onSelectQuestion) {
                    onSelectQuestion(cat.id, q.id);
                  }
                }}
              >
                {!q.used && TYPE_BADGE[q.type] && (
                  <span
                    className="absolute top-1 right-1 font-mono font-bold leading-none"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: TYPE_BADGE[q.type].bg,
                      color: TYPE_BADGE[q.type].color,
                    }}
                  >
                    {t(`host_board.${TYPE_BADGE[q.type].label}`)}
                  </span>
                )}
                {q.used ? '' : `$${q.value}`}
              </motion.div>
            );
          }),
        );
      })()}
    </div>
  );
}
