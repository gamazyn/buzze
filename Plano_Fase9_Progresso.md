# Fase 9 — Rebranding + i18n: Concluída ✅

**Branch:** `feat/fase-9-rebranding-i18n` → merged em `main` (commit `b7cbc17`)  
**Última atualização:** 2026-05-07

---

## Status: COMPLETA — merged em main

PR [#21](https://github.com/gamazyn/buzze/pull/21) fechado. Todos os CI checks passaram.

---

## O que foi entregue

### Rebranding visual

| Tela | Status |
|---|---|
| `LandingView` | ✅ Pill animado, cards Host/Player com gradiente, grid de 3 features, fundo grid sutil |
| `HostSetupView` | ✅ Grid de cards, avatar colorido por hash (`gameAccent()`), glow + checkmark animado, CTA fixo |
| `EditorView` | ✅ Rewrite: sidebar CATEGORIES/QUESTIONS, `FieldLabel`, `AudioPlayer` customizado, type selector com dots + glow |
| `LobbyView` | ✅ Header sticky, QR + links Wi-Fi/tunnel, players panel com avatares coloridos |
| `HostBoardView` | ✅ Board + Question layout condicional, TimerCircle SVG, buzzer queue, Final Challenge full-screen |
| `PlayerGameView` | ✅ Mobile-first: buzzer 3D, overlays full-screen por fase (double, final, speed_round, game_over) |
| `GameBoard` | ✅ Type badges (`showTypeBadges` prop — só host vê), speed_round incluído, altura responsiva |
| `Scoreboard` | ✅ `PlayerAvatar` com círculo colorido + inicial |
| `BuzzeLogo` | ✅ Novo componente centralizado |

### i18n

- `react-i18next` configurado com detecção síncrona (sem LanguageDetector assíncrono)
- `LanguageSwitcher` component (pill PT/EN/ES, fixed top-right)
- 3 locales completos: `pt-BR.json`, `en.json`, `es.json` — ~200 chaves cada
- Todas as views e componentes migrados — zero strings hardcoded em produção
- Novo tipo `speed_round` com chaves em todas as seções e nos 3 locales

### Docs

- `README.md` reescrito em inglês com badges, feature list e seção Download por plataforma (Windows/macOS/Linux) usando artefatos `buzze-*` corretos

---

## Fixes pós-merge

| Commit | Descrição |
|---|---|
| `6f73df4` | Merge de main: resolve conflitos de rebranding, incorpora speed_round |
| `f9750ee` | Fix TS: QuestionTimer não importado, event `player:speedAnswer`, campo `answer` inválido em finalWager |
| `6c77db8` | speed_round no design system: inline styles, tokens `#3ee67a`/`#c084fc`, i18n próprio no player |
| `b373299` | Fix GameBoard: `aspect-[4/3]` → `min-h/max-h` — células não crescem infinito em telas largas |
| `a8b8d05` | GameBoard: `showTypeBadges` prop, speed_round no TYPE_BADGE, altura `80px/140px` |

---

## Decisões de arquitetura

- **Question layout não é overlay** — layout condicional do HostBoardView que substitui o board. Evita z-index e permite sidebar própria da pergunta.
- **gameId via React Router state** — HostSetupView passa `{ state: { gameId } }` → LobbyView lê via `useLocation()`.
- **Custom AudioPlayer** — substitui `<audio>` nativo; mantém `<audio>` hidden no DOM para sync com jogadores.
- **TimerCircle** — SVG puro, separado do `QuestionTimer` bar (mantido para outros contextos).
- **CategoryName** — última palavra = fuchsia; palavra única = toda dim.
- **gameAccent()** — hash do nome do jogo → paleta de 7 cores; determinístico, sem metadado extra.
- **showTypeBadges** — prop no GameBoard, padrão `false`. Host passa explicitamente; player nunca vê os tipos antes da questão abrir.
- **i18n síncrono** — `initAsync: false` + `detectLng()` manual evita flash de chaves antes da hidratação.

---

## Próximas fases sugeridas

Ver `Plano_Reduzir_Complexidade.md` para backlog técnico pendente.
