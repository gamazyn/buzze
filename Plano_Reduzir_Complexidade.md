# Plano para Reduzir a Complexidade do Projeto

## Objetivo

Este documento propõe um plano incremental para tornar o projeto mais legível, simples e fácil de manter no futuro, preservando a arquitetura atual e evitando reescritas grandes.

A ideia central é reduzir acoplamento, organizar responsabilidades e deixar as regras de jogo mais fáceis de entender, testar e evoluir.

## Diagnóstico Resumido

O projeto já possui uma divisão saudável em pacotes:

- `packages/client`: frontend React.
- `packages/server`: backend Node.js com Express e Socket.IO.
- `packages/shared`: tipos e utilitários compartilhados.
- `packages/electron`: aplicação desktop e empacotamento.

A maior complexidade atual não está na escolha da stack, mas na concentração de responsabilidades em alguns arquivos do backend.

Os principais pontos de atenção são:

- handlers Socket.IO acumulam regra de negócio, validação, alteração de estado e emissão de eventos;
- autorização de host aparece repetida em mais de um handler;
- transições de fase existem, mas parte das regras ainda fica espalhada;
- estado da sessão pode ser atualizado diretamente por vários módulos;
- eventos compartilhados estão concentrados em um arquivo grande;
- timers estão acoplados à emissão via Socket.IO;
- persistência em arquivo é simples, mas a validação pode ser mais robusta;
- documentação técnica do fluxo de jogo e dos eventos pode ser melhorada.

## Princípios da Refatoração

- Fazer mudanças pequenas e progressivas.
- Evitar reescrita total.
- Preservar o comportamento atual.
- Separar regra de negócio de transporte.
- Preferir funções puras quando possível.
- Melhorar testes junto com cada extração.
- Criar abstrações apenas quando elas removerem duplicação real.
- Manter nomes diretos e específicos.
- Documentar decisões importantes.

## Resultado Esperado

Ao final do processo, o projeto deve ter:

- handlers menores e mais fáceis de ler;
- regras de jogo separadas em módulos claros;
- transições de fase centralizadas;
- testes mais simples e menos dependentes de mocks de Socket.IO;
- contratos de eventos mais organizados;
- gerenciamento de sessão mais previsível;
- timer mais testável;
- documentação útil para manutenção e onboarding.

---

# Fase 1: Documentar o Fluxo Atual

## 1.1 Criar documentação do fluxo do jogo

Antes de refatorar, documentar o funcionamento atual ajuda a evitar regressões e dá clareza sobre o que cada parte deveria fazer.

Documento sugerido:

```txt
docs/game-flow.md
```

Conteúdo recomendado:

- fases do jogo;
- eventos que mudam cada fase;
- responsabilidades do host;
- responsabilidades dos jogadores;
- fluxo de questão normal;
- fluxo de buzzer;
- fluxo de Todos Jogam;
- fluxo de Dupla Aposta;
- fluxo de Desafie um Jogador;
- fluxo de Rodada Rápida;
- fluxo do Desafio Final.

Exemplo de fluxo principal:

```txt
lobby -> board -> question -> buzzer_queue -> answer_reveal -> board
board -> final_challenge -> final_answer -> final_reveal -> game_over
```

Benefícios:

- facilita entender o sistema antes de alterar código;
- reduz risco de quebrar regra existente;
- melhora onboarding de futuros mantenedores.

## 1.2 Criar documentação dos eventos Socket.IO

Documento sugerido:

```txt
docs/socket-events.md
```

Tabela recomendada:

```md
| Evento | Direção | Fases válidas | Descrição |
|---|---|---|---|
| host:create | client -> server | qualquer | Cria uma sessão |
| player:join | client -> server | lobby | Jogador entra na sala |
| host:start | client -> server | lobby | Host inicia o jogo |
| host:selectQuestion | client -> server | board | Host seleciona questão |
| player:buzz | client -> server | question/all_play/buzzer_queue | Registra buzzer |
```

Benefícios:

- frontend e backend ficam alinhados;
- reduz dúvidas ao criar novos eventos;
- facilita testes manuais e automatizados.

---

# Fase 2: Reduzir Duplicação nos Handlers

## 2.1 Centralizar autenticação e autorização do host

Hoje a validação de host aparece em mais de um handler.

Criar um módulo:

```txt
packages/server/src/socket/guards.ts
```

Funções sugeridas:

```ts
requireHostSession(socket, payload)
requirePlayerSession(socket, payload)
requireSession(sessionId)
requirePhase(session, allowedPhases)
```

Objetivo:

- remover duplicação de `requireHost`;
- padronizar erros;
- evitar comportamentos diferentes entre handlers.

Resultado esperado:

```ts
const session = requireHostSession(socket, payload);
if (!session.ok) return emitSocketError(socket, session.error);
```

## 2.2 Centralizar emissão de erros

Criar um helper:

```txt
packages/server/src/socket/errors.ts
```

Funções sugeridas:

```ts
emitSocketError(socket, error)
notFound(message)
invalidTransition(message)
notAllowed(message)
rateLimited(message)
```

Benefícios:

- mensagens mais consistentes;
- handlers mais curtos;
- menos strings duplicadas.

## 2.3 Criar helpers para emissão de eventos

Criar módulo:

```txt
packages/server/src/socket/emitters.ts
```

Funções sugeridas:

```ts
emitScoreUpdate(io, sessionId, players)
emitQuestionSelected(io, sessionId, activeQuestion, phase)
emitQuestionClosed(io, sessionId, questionId, categoryId, phase)
emitBuzzerQueueUpdate(io, sessionId, queue, phase)
emitGameOver(io, sessionId, finalScores, winnerId)
```

Benefícios:

- reduz duplicação de nomes de eventos;
- centraliza payloads;
- facilita mudanças futuras nos contratos.

---

# Fase 3: Separar Regras de Jogo dos Handlers

## 3.1 Criar pasta de domínio

Criar uma camada para regras puras:

```txt
packages/server/src/domain/
  phases.ts
  scoring.ts
  questions.ts
  buzzers.ts
  finalChallenge.ts
  doubleWager.ts
  speedRound.ts
```

Essa camada não deve depender de Socket.IO.

Ela deve receber dados, calcular o próximo estado e devolver resultado.

## 3.2 Extrair regras de pontuação

Criar:

```txt
packages/server/src/domain/scoring.ts
```

Funções sugeridas:

```ts
calculateStandardScore(questionValue, correct)
calculateDoubleWagerScore(wager, correct)
calculateChallengeScore(questionValue, correct)
calculateSpeedRoundScore(questionValue, rank)
calculateFinalChallengeScore(wager, correct)
```

Benefícios:

- regras de pontuação ficam fáceis de encontrar;
- testes ficam simples;
- reduz risco ao alterar modos especiais.

Testes recomendados:

- acerto em questão normal;
- erro em questão normal;
- Dupla Aposta com acerto;
- Dupla Aposta com erro;
- Desafio Final com aposta zero;
- Rodada Rápida para primeiro, segundo, terceiro e demais.

## 3.3 Extrair regras de buzzer

Criar:

```txt
packages/server/src/domain/buzzers.ts
```

Funções sugeridas:

```ts
canPlayerBuzz(session, playerId)
addPlayerToBuzzerQueue(session, playerId, timestamp)
getNextBuzzerEntry(queue)
markBuzzerEntryResponded(queue, playerId)
```

Benefícios:

- reduz complexidade de `buzzerHandler`;
- facilita testar ordenação por timestamp;
- concentra regras de duplicidade, bloqueio e fila.

Testes recomendados:

- jogador não pode buzzar fora da fase correta;
- jogador não entra duas vezes na fila;
- fila ordena por timestamp do servidor;
- jogador bloqueado em Todos Jogam não pode buzzar novamente.

## 3.4 Extrair regras de questão

Criar:

```txt
packages/server/src/domain/questions.ts
```

Funções sugeridas:

```ts
findQuestion(gameConfig, categoryId, questionId)
createActiveQuestion(categoryId, questionId, question, timerMs)
markQuestionUsed(gameConfig, categoryId, questionId)
areAllQuestionsUsed(gameConfig)
```

Benefícios:

- simplifica seleção e fechamento de questão;
- reduz duplicação;
- facilita evoluir o board.

## 3.5 Extrair regras de modos especiais

Criar módulos específicos:

```txt
packages/server/src/domain/doubleWager.ts
packages/server/src/domain/finalChallenge.ts
packages/server/src/domain/speedRound.ts
```

Funções sugeridas:

```ts
getMaxDoubleWager(playerScore, questionValue)
lockDoubleWager(session, playerId, amount)
submitFinalWager(session, playerId, amount)
submitFinalAnswer(session, playerId, answer)
submitSpeedRoundAnswer(session, playerId, answer)
```

Benefícios:

- cada modo especial passa a ter um lugar próprio;
- handlers deixam de crescer indefinidamente;
- regras ficam mais fáceis de testar isoladamente.

---

# Fase 4: Fortalecer a State Machine

## 4.1 Centralizar transições de fase

O projeto já possui um mapa de transições. O próximo passo é fazer com que mais decisões passem por ele.

Arquivo atual:

```txt
packages/server/src/managers/gameStateManager.ts
```

Melhorias sugeridas:

```ts
canTransition(from, to)
assertTransition(from, to)
getNextPhaseAfterQuestion(session)
getNextPhaseAfterAnswerReveal(session)
getNextPhaseAfterAllPlayersLocked(session)
```

Benefícios:

- reduz `if` espalhado;
- melhora previsibilidade;
- evita mudanças inválidas de fase.

## 4.2 Mapear eventos permitidos por fase

Criar:

```txt
packages/server/src/domain/eventPhases.ts
```

Exemplo:

```ts
const EVENT_PHASES = {
  'host:start': ['lobby'],
  'host:selectQuestion': ['board'],
  'player:buzz': ['question', 'all_play', 'buzzer_queue'],
  'player:finalWager': ['final_challenge'],
  'player:finalAnswer': ['final_answer'],
};
```

Benefícios:

- regra fica explícita;
- facilita documentação automática;
- ajuda a criar testes de contrato.

## 4.3 Criar testes de transição

Testar:

- `lobby -> board`;
- `board -> question`;
- `question -> buzzer_queue`;
- `answer_reveal -> board`;
- `board -> final_challenge`;
- `final_challenge -> final_answer`;
- `final_answer -> final_reveal`;
- `final_reveal -> game_over`;
- transições inválidas.

---

# Fase 5: Criar Use Cases

## 5.1 Objetivo

Handlers Socket.IO devem ser finos.

Eles devem:

- receber payload;
- chamar um caso de uso;
- persistir a sessão atualizada;
- emitir eventos.

A regra principal deve viver fora do handler.

## 5.2 Estrutura sugerida

```txt
packages/server/src/useCases/
  createSession.ts
  joinSession.ts
  startGame.ts
  selectQuestion.ts
  submitBuzz.ts
  judgeAnswer.ts
  skipPlayer.ts
  assignDouble.ts
  submitDoubleWager.ts
  startFinalChallenge.ts
  submitFinalWager.ts
  submitFinalAnswer.ts
  revealFinalAnswer.ts
```

## 5.3 Formato de retorno recomendado

Criar um tipo de resultado simples:

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
```

Exemplo:

```ts
const result = judgeAnswer({
  session,
  playerId,
  correct,
});

if (!result.ok) {
  return emitSocketError(socket, result.error);
}

updateSession(sessionId, result.value.session);
emitScoreUpdate(io, sessionId, result.value.players);
```

Benefícios:

- fluxo mais explícito;
- menos retornos silenciosos;
- testes mais fáceis;
- erros mais consistentes.

---

# Fase 6: Melhorar o Gerenciamento de Sessões

## 6.1 Encapsular o mapa de sessões

Hoje as sessões são guardadas em um `Map`.

Isso é simples e adequado, mas pode ficar mais organizado com um repositório.

Criar:

```txt
packages/server/src/repositories/sessionRepository.ts
```

Formato sugerido:

```ts
class SessionRepository {
  create(session)
  get(sessionId)
  update(sessionId, updater)
  replace(sessionId, session)
  delete(sessionId)
  findByHostId(hostId)
  findByPlayerId(playerId)
  cleanupExpired()
}
```

Benefícios:

- centraliza acesso ao estado;
- facilita testes;
- reduz updates imprevisíveis;
- abre caminho para persistência diferente no futuro, se necessário.

## 6.2 Reduzir updates parciais muito abertos

`updateSession(sessionId, Partial<GameSession>)` é prático, mas permite alterações grandes sem controle.

Plano gradual:

1. manter `updateSession` inicialmente;
2. criar funções específicas para operações frequentes;
3. migrar handlers/use cases aos poucos.

Funções possíveis:

```ts
setSessionPhase(sessionId, phase)
setActiveQuestion(sessionId, activeQuestion)
updateSessionPlayers(sessionId, players)
clearBuzzerQueue(sessionId)
endSession(sessionId)
```

Benefícios:

- menor risco de estado inconsistente;
- operações mais legíveis;
- melhor rastreabilidade.

---

# Fase 7: Simplificar Timers

## 7.1 Separar timer de Socket.IO

Hoje o timer gerencia tempo e também emite eventos.

Criar uma API mais genérica:

```ts
startTimer({
  sessionId,
  durationMs,
  onTick,
  onPause,
  onResume,
  onExpire,
});
```

O timer não precisa saber sobre `io.to(...)`.

Quem chama o timer decide o que emitir.

Benefícios:

- timer fica testável isoladamente;
- reduz acoplamento;
- facilita mudar frequência de tick;
- melhora clareza dos efeitos colaterais.

## 7.2 Centralizar callbacks de expiração

Criar funções claras:

```ts
handleQuestionTimerExpired(sessionId)
handleFinalWagerTimerExpired(sessionId)
handleFinalAnswerTimerExpired(sessionId)
```

Benefícios:

- evita callbacks duplicados;
- reduz comportamento divergente;
- facilita testar expiração por fase.

## 7.3 Testes recomendados

- iniciar timer;
- pausar timer;
- retomar timer;
- estender timer;
- definir novo tempo;
- expirar questão normal;
- expirar Desafio Final;
- limpar timer ao encerrar jogo.

---

# Fase 8: Organizar Tipos e Contratos Compartilhados

## 8.1 Dividir arquivo de eventos

O arquivo de eventos compartilhados é grande e tende a crescer.

Estrutura sugerida:

```txt
packages/shared/src/types/events/
  lobby.ts
  game.ts
  buzzer.ts
  timer.ts
  final.ts
  specialModes.ts
  index.ts
```

Manter compatibilidade exportando tudo pelo `index.ts`.

Benefícios:

- melhora navegação;
- reduz conflito em alterações;
- facilita encontrar tipos por domínio.

## 8.2 Padronizar nomes e payloads

Formalizar padrões:

- `host:*` para ações do host;
- `player:*` para ações de jogadores;
- `game:*` para eventos gerais;
- `question:*` para eventos de questão;
- `buzzer:*` para eventos de buzzer;
- `timer:*` para eventos de timer;
- `final:*` para Desafio Final.

Benefícios:

- API de socket mais previsível;
- facilita documentação;
- melhora manutenção do frontend.

## 8.3 Considerar constantes para nomes de eventos

Opcionalmente criar:

```txt
packages/shared/src/events/names.ts
```

Exemplo:

```ts
export const SOCKET_EVENTS = {
  HOST_CREATE: 'host:create',
  PLAYER_JOIN: 'player:join',
  GAME_STARTED: 'game:started',
} as const;
```

Benefícios:

- reduz strings soltas;
- facilita refatoração;
- evita erros de digitação.

Cuidados:

- não exagerar;
- se piorar a leitura, manter strings diretas nos handlers e apenas documentar bem.

---

# Fase 9: Melhorar Validação e Persistência

## 9.1 Reutilizar schemas de validação

Hoje o schema de jogo fica na rota.

Mover para:

```txt
packages/server/src/schemas/gameConfigSchema.ts
```

Ou, se fizer sentido compartilhar validação com frontend:

```txt
packages/shared/src/schemas/gameConfigSchema.ts
```

Benefícios:

- rotas ficam menores;
- validação fica testável;
- evita duplicação futura.

## 9.2 Validar jogos ao carregar do disco

Atualmente, o carregamento faz parse do JSON e assume que o formato é válido.

Plano:

```ts
const parsed = GameConfigSchema.safeParse(JSON.parse(raw));
if (!parsed.success) return null;
return parsed.data;
```

Benefícios:

- evita estado inválido;
- protege contra arquivos editados manualmente;
- melhora previsibilidade.

## 9.3 Melhorar erros de persistência

Hoje algumas falhas retornam `null` ou lista vazia.

Plano:

- logar erro em modo desenvolvimento;
- distinguir arquivo não encontrado de JSON inválido;
- criar mensagens mais claras quando necessário.

Benefícios:

- debugging mais fácil;
- menos falhas silenciosas;
- melhor suporte futuro.

---

# Fase 10: Melhorar Testes

## 10.1 Priorizar testes de domínio

À medida que regras forem extraídas, criar testes sem Socket.IO.

Áreas prioritárias:

- pontuação;
- fases;
- buzzer;
- seleção de questão;
- fechamento de questão;
- Todos Jogam;
- Dupla Aposta;
- Desafie um Jogador;
- Rodada Rápida;
- Desafio Final.

Benefícios:

- testes mais rápidos;
- menos mocks complexos;
- refatoração mais segura.

## 10.2 Manter alguns testes de integração dos handlers

Handlers ainda devem ser testados, mas com menor volume.

Testar principalmente:

- payload recebido;
- chamada correta do caso de uso;
- atualização de sessão;
- emissão do evento esperado;
- emissão de erro esperado.

## 10.3 Criar fixtures reutilizáveis

Criar:

```txt
packages/server/src/__tests__/fixtures/
  games.ts
  sessions.ts
  players.ts
```

Benefícios:

- reduz duplicação;
- testes ficam menores;
- cenários ficam mais consistentes.

## 10.4 Criar testes de contrato de eventos

Garantir que payloads esperados por frontend e backend continuam compatíveis.

Exemplos:

- `host:create` retorna `sessionId`, `hostToken`, `tunnelUrl`, `localUrl`;
- `game:started` nunca envia resposta final secreta;
- `buzzer:queueUpdate` vai apenas ao host;
- `final:hostDetails` vai apenas ao host.

---

# Fase 11: Documentar Build e App Desktop

## 11.1 Documentar build do Electron

Criar:

```txt
docs/electron-build.md
```

Conteúdo recomendado:

- como o client é buildado;
- como o server é empacotado;
- onde o bundle do backend é gerado;
- como o Electron inicia o servidor local;
- quais variáveis de ambiente são configuradas;
- como o `DATA_DIR` é definido em produção;
- como o tunnel é iniciado.

Benefícios:

- reduz risco em releases;
- facilita manutenção futura;
- deixa claro o acoplamento entre desktop e backend.

## 11.2 Criar checklist de release

Documento sugerido:

```txt
docs/release-checklist.md
```

Checklist recomendado:

```txt
1. pnpm install
2. pnpm type-check
3. pnpm test
4. pnpm build
5. pnpm electron:dist
6. abrir app empacotado
7. criar jogo
8. hospedar sala
9. entrar como jogador
10. testar buzzer
11. testar mídia
12. testar Todos Jogam
13. testar Dupla Aposta
14. testar Rodada Rápida
15. testar Desafio Final
16. validar atualização de score
17. validar encerramento do jogo
```

Benefícios:

- reduz regressões manuais;
- melhora confiança antes de publicar;
- cria rotina repetível.

---

# Fase 12: Organização Visual do Código

## 12.1 Padronizar estrutura do backend

Estrutura final sugerida:

```txt
packages/server/src/
  config.ts
  index.ts
  server.ts
  domain/
    buzzers.ts
    doubleWager.ts
    finalChallenge.ts
    phases.ts
    questions.ts
    scoring.ts
    speedRound.ts
  handlers/
    buzzerHandler.ts
    finalHandler.ts
    gameHandler.ts
    lobbyHandler.ts
  middleware/
    authMiddleware.ts
    rateLimiter.ts
  repositories/
    sessionRepository.ts
  routes/
    gameRoutes.ts
    mediaRoutes.ts
  schemas/
    gameConfigSchema.ts
  socket/
    emitters.ts
    errors.ts
    guards.ts
  storage/
    fileStorage.ts
  timers/
    timerManager.ts
  useCases/
    createSession.ts
    joinSession.ts
    judgeAnswer.ts
    selectQuestion.ts
    startGame.ts
    submitBuzz.ts
```

Essa estrutura deve ser adotada aos poucos, não de uma vez.

## 12.2 Critério para mover código

Mover código somente quando:

- a função tem responsabilidade clara;
- há teste ou comportamento fácil de verificar;
- o nome do novo módulo melhora a descoberta;
- o handler fica visivelmente mais simples.

Evitar mover código apenas por organização estética.

---

# Ordem Recomendada de Execução

## Etapa 1: Baixo risco

1. Documentar fluxo atual do jogo.
2. Documentar eventos Socket.IO.
3. Centralizar autorização de host.
4. Centralizar emissão de erros.
5. Criar helpers de emissão de eventos.

Resultado esperado:

- menos duplicação;
- handlers mais legíveis;
- baixo risco de regressão.

## Etapa 2: Regras puras

1. Extrair pontuação.
2. Extrair regras de fase.
3. Extrair regras de questão.
4. Extrair regras de buzzer.
5. Criar testes de domínio.

Resultado esperado:

- regras fáceis de testar;
- handlers menores;
- alterações futuras mais seguras.

## Etapa 3: Casos de uso

1. Criar use cases principais.
2. Migrar handlers gradualmente.
3. Padronizar tipo `Result`.
4. Reduzir retornos silenciosos.

Resultado esperado:

- fluxo mais explícito;
- erros mais consistentes;
- menor dependência de Socket.IO nos testes.

## Etapa 4: Estado e timer

1. Encapsular sessões em repositório.
2. Reduzir updates parciais abertos.
3. Separar timer de Socket.IO.
4. Centralizar callbacks de expiração.

Resultado esperado:

- estado mais previsível;
- timer mais testável;
- menos acoplamento.

## Etapa 5: Contratos e documentação

1. Dividir tipos de eventos.
2. Mover schemas de validação.
3. Validar jogos ao carregar do disco.
4. Documentar build Electron.
5. Criar checklist de release.

Resultado esperado:

- projeto mais navegável;
- contratos mais claros;
- manutenção futura mais simples.

---

# O Que Evitar Durante a Refatoração

## Evitar reescritas grandes

Mudanças grandes dificultam revisão e aumentam risco de regressão.

Preferir ciclos pequenos:

```txt
extrair -> testar -> validar -> seguir
```

## Evitar abstrações genéricas demais

Evitar nomes amplos como:

```txt
GameServiceManager
GenericEventProcessor
AbstractStateController
UniversalSocketDispatcher
```

Preferir nomes específicos:

```txt
scoring.ts
buzzers.ts
finalChallenge.ts
sessionRepository.ts
socketEmitters.ts
```

## Evitar trocar persistência cedo demais

A persistência em JSON é simples e combina com o escopo atual.

Antes de trocar armazenamento, melhorar:

- validação;
- mensagens de erro;
- organização das funções;
- testes.

## Evitar misturar refatoração com feature nova

Durante essas fases, evitar adicionar regras novas de jogo.

O ideal é estabilizar a estrutura primeiro.

---

# Métricas de Sucesso

O plano estará funcionando se:

- handlers tiverem menos responsabilidade;
- regras de pontuação forem testadas sem socket;
- regras de fase forem testadas isoladamente;
- eventos estiverem documentados;
- erros forem emitidos de forma consistente;
- mudanças em modos especiais exigirem alterações em poucos arquivos;
- novos testes forem mais simples de escrever;
- o fluxo do jogo puder ser entendido pela documentação;
- o build desktop tiver checklist claro.

Indicadores práticos:

- `gameHandler.ts`, `buzzerHandler.ts` e `finalHandler.ts` ficam menores;
- novos módulos de domínio têm testes próprios;
- menos strings de eventos repetidas;
- menos lógica duplicada de host;
- menos retornos silenciosos em ações inválidas;
- onboarding de manutenção fica mais rápido.

---

# Checklist Geral

## Documentação

- [ ] Criar `docs/game-flow.md`.
- [ ] Criar `docs/socket-events.md`.
- [ ] Criar `docs/electron-build.md`.
- [ ] Criar `docs/release-checklist.md`.

## Socket

- [ ] Centralizar autorização de host.
- [ ] Centralizar emissão de erros.
- [ ] Criar helpers de emissão de eventos.
- [ ] Mapear eventos permitidos por fase.

## Domínio

- [ ] Extrair regras de pontuação.
- [ ] Extrair regras de buzzer.
- [ ] Extrair regras de questão.
- [ ] Extrair regras de fases.
- [ ] Extrair regras de Dupla Aposta.
- [ ] Extrair regras de Desafio Final.
- [ ] Extrair regras de Rodada Rápida.

## Use Cases

- [ ] Criar `createSession`.
- [ ] Criar `joinSession`.
- [ ] Criar `startGame`.
- [ ] Criar `selectQuestion`.
- [ ] Criar `submitBuzz`.
- [ ] Criar `judgeAnswer`.
- [ ] Criar `skipPlayer`.
- [ ] Criar `assignDouble`.
- [ ] Criar `submitDoubleWager`.
- [ ] Criar `startFinalChallenge`.
- [ ] Criar `submitFinalWager`.
- [ ] Criar `submitFinalAnswer`.
- [ ] Criar `revealFinalAnswer`.

## Sessões

- [ ] Criar repositório de sessão.
- [ ] Encapsular acesso ao `Map`.
- [ ] Reduzir updates parciais abertos.
- [ ] Melhorar limpeza de sessões expiradas.

## Timer

- [ ] Separar timer de Socket.IO.
- [ ] Centralizar expiração de questão.
- [ ] Centralizar expiração do Desafio Final.
- [ ] Testar pause, resume, extend e set.

## Shared

- [ ] Dividir tipos de eventos por domínio.
- [ ] Manter exports compatíveis.
- [ ] Padronizar nomes de eventos.
- [ ] Avaliar constantes para eventos.

## Persistência

- [ ] Mover schema de validação para módulo próprio.
- [ ] Validar jogos ao carregar do disco.
- [ ] Melhorar mensagens de erro.
- [ ] Testar JSON inválido.

## Testes

- [ ] Criar fixtures reutilizáveis.
- [ ] Testar pontuação.
- [ ] Testar fases.
- [ ] Testar buzzer.
- [ ] Testar modos especiais.
- [ ] Testar Desafio Final.
- [ ] Manter testes de integração dos handlers.

---

# Conclusão

O caminho recomendado é evoluir o projeto de forma incremental, reduzindo responsabilidades dos handlers e movendo regras de jogo para módulos de domínio testáveis.

A prioridade deve ser:

1. documentar o fluxo atual;
2. centralizar validação, autorização e emissão de eventos;
3. extrair regras puras;
4. criar use cases;
5. organizar sessão, timer e contratos compartilhados;
6. fortalecer testes;
7. documentar build e release.

Esse plano preserva o funcionamento atual, reduz risco e deixa o projeto mais preparado para receber novas funcionalidades sem aumentar a complexidade de manutenção.
