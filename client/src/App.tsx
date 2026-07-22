import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from './store/useAppStore'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Layout from './components/Layout'

// Lazy loaded page components
const Admin = lazy(() => import('./pages/Admin'))
const FlashcardPlay = lazy(() => import('./pages/FlashcardPlay'))
const PracticePlay = lazy(() => import('./pages/PracticePlay'))
const FlashcardDetail = lazy(() => import('./pages/FlashcardDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Stats = lazy(() => import('./pages/Stats'))
const Settings = lazy(() => import('./pages/Settings'))
const ManageFlashcards = lazy(() => import('./pages/ManageFlashcards'))
const ImportFlashcard = lazy(() => import('./pages/ImportFlashcard'))
const EditFlashcard = lazy(() => import('./pages/EditFlashcard'))
const EditFlashcards = lazy(() => import('./pages/EditFlashcards'))
const FlashcardRoom = lazy(() => import('./pages/FlashcardRoom'))
const RoomJoin = lazy(() => import('./pages/RoomJoin'))
const RoadmapHub = lazy(() => import('./pages/RoadmapHub'))
const DeckRoadmap = lazy(() => import('./pages/DeckRoadmap'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppContent() {
  const { user, isLoggedIn, isLoading, fetchMe, fetchAuthConfig } = useAppStore()

  useEffect(() => {
    fetchMe()
    fetchAuthConfig()
  }, [fetchMe, fetchAuthConfig])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 font-medium font-sans">Initializing Vocaburn Engine...</span>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Suspense fallback={
        <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest font-sans">Loading Page...</span>
          </div>
        </div>
      }>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<Login />} />

          {/* Client Layout Routes (Protected / Guest Landing) */}
          <Route element={<Layout />}>
            <Route path="/" element={isLoggedIn ? <Dashboard /> : <Landing />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            
            {/* Protected Routes (Authenticated only) */}
            <Route path="/library" element={isLoggedIn ? <Library /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/stats" element={isLoggedIn ? <Stats /> : <Navigate to="/login" replace />} />
            <Route path="/settings" element={isLoggedIn ? <Settings /> : <Navigate to="/login" replace />} />
            <Route path="/manage" element={isLoggedIn ? <ManageFlashcards /> : <Navigate to="/login" replace />} />
            <Route path="/manage/import" element={isLoggedIn ? <ImportFlashcard /> : <Navigate to="/login" replace />} />
            <Route path="/manage/edit/:id" element={isLoggedIn ? <EditFlashcard /> : <Navigate to="/login" replace />} />
            <Route path="/manage/edit/:id/flashcards" element={isLoggedIn ? <EditFlashcards /> : <Navigate to="/login" replace />} />
            <Route path="/roadmap" element={isLoggedIn ? <RoadmapHub /> : <Navigate to="/login" replace />} />
            <Route path="/room/join" element={isLoggedIn ? <RoomJoin /> : <Navigate to="/login" replace />} />
            
            {/* Admin Control Panel */}
            <Route path="/admin/:tab?" element={isLoggedIn && user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
          </Route>

          {/* Fullscreen Protected Views */}
          <Route path="/flashcard/:id" element={isLoggedIn ? <FlashcardDetail /> : <Navigate to="/login" replace />} />
          <Route path="/flashcard/:id/roadmap" element={isLoggedIn ? <DeckRoadmap /> : <Navigate to="/login" replace />} />
          <Route path="/flashcard/:id/play" element={isLoggedIn ? <FlashcardPlay /> : <Navigate to="/login" replace />} />
          <Route path="/practice/:id/:subMode?" element={isLoggedIn ? <PracticePlay /> : <Navigate to="/login" replace />} />
          <Route path="/room/:code" element={isLoggedIn ? <FlashcardRoom /> : <Navigate to="/login" replace />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
