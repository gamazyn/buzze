import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const LandingView = lazy(() => import('./views/LandingView.js').then((module) => ({ default: module.LandingView })));
const HostSetupView = lazy(() => import('./views/HostSetupView.js').then((module) => ({ default: module.HostSetupView })));
const LobbyView = lazy(() => import('./views/LobbyView.js').then((module) => ({ default: module.LobbyView })));
const HostBoardView = lazy(() => import('./views/host/HostBoardView.js').then((module) => ({ default: module.HostBoardView })));
const PlayerGameView = lazy(() => import('./views/player/PlayerGameView.js').then((module) => ({ default: module.PlayerGameView })));
const EditorView = lazy(() => import('./views/editor/EditorView.js').then((module) => ({ default: module.EditorView })));
const JoinView = lazy(() => import('./views/JoinView.js').then((module) => ({ default: module.JoinView })));

function RouteFallback() {
  return <div style={{ minHeight: '100vh', background: '#07060f' }} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/host" element={<HostSetupView />} />
          <Route path="/host/:sessionId" element={<LobbyView />} />
          <Route path="/host/:sessionId/board" element={<HostBoardView />} />
          <Route path="/game/:sessionId/player" element={<PlayerGameView />} />
          <Route path="/join/:sessionId" element={<JoinView />} />
          <Route path="/editor" element={<EditorView />} />
          <Route path="/editor/:gameId" element={<EditorView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
