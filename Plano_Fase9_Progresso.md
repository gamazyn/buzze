# Fase 9 — Rebranding + i18n: Progresso

**Branch:** `feat/fase-9-rebranding-i18n`  
**Última atualização:** 2026-05-05

---

## ✅ Concluído

### Infraestrutura i18n
- `packages/client/src/i18n/index.ts` — removido `LanguageDetector` (assíncrono); `detectLng()` síncrono lê `localStorage['buzze_lang']` → `window.__APP_LOCALE__` → `navigator.languages` → fallback `pt-BR`; `initAsync: false`
- `LanguageSwitcher.tsx` — pill PT/EN/ES, fixed top-right, chama `setLanguage()`
- Locales: `pt-BR.json`, `en.json`, `es.json` — cobrem todas as seções abaixo

### Telas implementadas (pixel-perfect vs protótipo)

#### 1. Landing (`LandingView.tsx`) ✅
- HeroWordmark: bolt SVG + "buzze.io" com `.io` em fuchsia
- Pill badge traduzida
- Two-card layout: Host (violet border) + Join (form nome+código)
- Features section: 01/02/03 com separadores
- LanguageSwitcher fixo top-right

#### 2. Lobby · Host (`LobbyView.tsx`) ✅
- Header sticky: BuzzeLogo + room code badge pulsante "● AO VIVO" + Leave
- Grid 2 colunas: esquerda (QR + game info + start button) / direita (players panel)
- Players panel: Avatar circle (inicial colorida) + nome + PRONTO/disconnected
- Slots vazios animados com `waitingPulse` escalonado
- Fetch do game config via `/api/games/${state.gameId}` (gameId via React Router location state)
- `HostSetupView.tsx`: passa `{ state: { gameId: selected } }` ao navegar para `/host/:sessionId`

#### 3. Board (`HostBoardView.tsx` + componentes) ✅
- **Header**: BuzzeLogo | SALA badge + contador used/total + botão Final (âmbar) + Sair
- **GameBoard.tsx**: type badges no canto superior dos tiles — TODOS (verde), DESAFIO (âmbar), DUPLA (fuchsia)
- **GameBoard.tsx**: `CategoryName` — última palavra da categoria em fuchsia, restante dim
- **Scoreboard.tsx**: `PlayerAvatar` — círculo colorido com inicial maiúscula (substituiu dot); título via `t('scoreboard.title')`
- i18n: todos os strings do board/overlays substituídos por `t()`

#### 4. Question (`HostBoardView.tsx` — layout condicional) ✅
- Quando `phase === 'question' | 'all_play' | 'buzzer_queue'`: layout Question (não overlay)
- **Header muda**: exibe "SALA X" + badge "CATEGORIA · $VALOR" em vez dos botões de board
- **Question card**: fundo escuro + glow radial roxo; pill de tipo; subtítulo categoria·valor; texto da pista em mono grande; custom audio player (play/pause, progress scrubável, "ÁUDIO DA DICA" / "HOST SYNC", tempo); resposta visível só ao host (dim)
- **Custom AudioPlayer component**: controla `<audio>` hidden, estado `playing/currentTime/duration`
- **TimerCircle component**: SVG arco; cor muda fuchsia→âmbar→vermelho conforme urgência; label "TIMER"
- **Barra de controles**: TimerCircle + Reset/+10s/Pausar + "× Errado" (vermelho) + "✓ Correto" (verde) + "Revelar"
  - Errado/Correto só aparecem quando `pendingBuzzers.length > 0`
- **Sidebar direita**:
  - "FILA DE BUZZERS": position + Avatar + nome + delta "+0.32s"; #1 em destaque violet
  - "PLACAR AO VIVO": dot + nome + score (compact, sem card)
- Challenge mode: step 1 (selecionar desafiado) embutido no sidebar; step 2 (julgar) nos botões da barra

---

## 🔜 Pendente

#### 5. Answer (`HostBoardView.tsx` — `phase === 'answer_reveal'`) ✅
- `isQuestionView` extendida para incluir `answer_reveal`
- Dentro do question card: card verde (success bg/border) com label "RESPOSTA" + texto da resposta
- clueAudio player ocultado; answerAudio/answerMedia mostrados
- Hint dim da resposta ocultado no reveal
- Control bar: timer controls ocultados, "Continuar →" substitui botões Errado/Correto/Revelar
- Overlay antigo de `answer_reveal` removido

#### 6. Player view (`PlayerGameView.tsx`) ✅
- Reescrita completa com layout mobile-first (sticky header, scroll vertical)
- Header: BuzzeLogo pequeno + badge "● AO VIVO"
- Score card: Avatar colorido + nome + jogo + $ fuchsia
- IDLE (board): mini-board read-only + "AGUARDANDO PRÓXIMA QUESTÃO" blinking panel
- Question phases (question/all_play/buzzer_queue): clue card + audio sync indicator + buzzer 3D grande + status bar
- answer_reveal: clue panel + audio indicator + card verde "RESPOSTA CORRETA" + "AGUARDANDO HOST CONTINUAR"
- Special phases como full-screen: double_wager, final_challenge, final_reveal, game_over
- Responsividade: LandingView features com flexWrap; LobbyView grid colapsa p/ coluna no mobile (grid-cols-1 lg:grid-cols-[1fr_380px])

#### 7. Final Challenge Host (`HostBoardView.tsx` — `isFinalPhase`) ✅
- Full-screen (não overlay escurecido) — mesmo `background: #07060f` + reusa o Header
- Pill badge: "◆ DESAFIO FINAL ◆ APOSTA" | "◆ DESAFIO FINAL ◆ REVELAÇÃO"
- Clue: JetBrains Mono, clamp(28px,5vw,58px), peso 600
- Progress bar: largura = wagersSubmitted/totalPlayers, cor fuchsia (aposta) → verde (reveal)
- APOSTA panel: avatar + nome + [✓ Enviou | ✕/✓ buttons (wager+answer visíveis) | AGUARDANDO…]
- REVELAÇÃO panel: RESPOSTA CORRETA (fuchsia) + linhas com resposta do jogador + ✕/✓ buttons

#### 8. Final Wager Player ✅
- Embutido em `PlayerGameView` quando `phase === 'final_challenge'`

#### 9. Lobby Player ✅
- `PlayerGameView` quando `!gameConfig` — sticky header com live badge, identity card grande com Avatar 64px + nome + code da sala, players list com Avatar circles

#### 10. Game Picker (`HostSetupView.tsx`) ✅
- Heading com Syne, label mono `→ HOSPEDAR`, emojis removidos
- Botão "Criar Sala →" limpo

#### 11. Editor (`EditorView.tsx`) ✅
- Background `#07060f`, grid overlay opacity 0.04, sidebar `#0d0b18`
- Active question: gradient violet, borderLeft fuchsia (removido azul/dourado antigo)
- Desafio Final active: mesma palette
- `all_play` TYPE_META: `#ffc857`

#### 12. Results (`phase === 'game_over'`) ✅
- Full-screen (mesmo bg #07060f) + Header reutilizado
- "FIM DE JOGO" label mono fuchsia
- "[winner] venceu." — Syne clamp(44-84px), gradient fg0→fuchsia→violet
- Pódio 3 colunas (ordem: 2º·1º·3º), align-items end; pilares com alturas 220/170/140px, gradiente violet no 1º
- Full standings: panel borderless, rows 01/02/03… + Avatar(36) + nome + score (danger se negativo)
- Botão "Voltar ao início"

---

## Arquivos-chave modificados nesta fase

| Arquivo | O que mudou |
|---|---|
| `packages/client/src/i18n/index.ts` | Detecção síncrona, sem LanguageDetector |
| `packages/client/src/i18n/locales/pt-BR.json` | Todas as seções: landing, lobby, host_setup, host_board, player, editor, scoreboard |
| `packages/client/src/i18n/locales/en.json` | Idem em inglês |
| `packages/client/src/i18n/locales/es.json` | Idem em espanhol |
| `packages/client/src/components/ui/LanguageSwitcher.tsx` | Novo componente |
| `packages/client/src/components/ui/BuzzeLogo.tsx` | Novo componente |
| `packages/client/src/views/LandingView.tsx` | Reescrita completa |
| `packages/client/src/views/LobbyView.tsx` | Reescrita completa |
| `packages/client/src/views/HostSetupView.tsx` | Passa gameId via navigation state |
| `packages/client/src/views/host/HostBoardView.tsx` | Reescrita completa (Board + Question layouts) |
| `packages/client/src/components/board/GameBoard.tsx` | Type badges + CategoryName |
| `packages/client/src/components/scores/Scoreboard.tsx` | PlayerAvatar + i18n |
| `packages/client/tsconfig.json` | Path alias `@buzze/shared` → `src/index.ts` |
| `turbo.json` | Fix `@buzze/electron#test` |

---

## Decisões de arquitetura

- **Question layout não é overlay** — é um layout condicional do próprio HostBoardView que substitui o board. Isso evita z-index e permite sidebar própria da pergunta.
- **gameId via React Router state** — HostSetupView passa `{ state: { gameId } }` → LobbyView lê via `useLocation()`, sem mudar server ou store.
- **Custom AudioPlayer** — substitui `<audio>` nativo para bater com o design; mantém o `<audio>` no DOM (hidden) para o `emitAudio` / sync com jogadores.
- **TimerCircle** — SVG puro, não usa QuestionTimer bar (que foi mantida para outros contextos).
- **CategoryName** — split por espaço; última palavra = fuchsia; se palavra única, toda dim (sem destacar).
