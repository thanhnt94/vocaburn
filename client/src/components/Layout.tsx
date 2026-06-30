import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutGrid, Compass, BarChart3, User, BrainCircuit, Bell, Settings, Plus, Library, Users, FolderKanban, BookOpen, Flame, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function Layout() {
  const { user, gamify, setUser, setGamify, isLoggedIn, authConfig } = useAppStore()
  const location = useLocation()

  // Ensure data is loaded even if we land on subpages (only if logged in)
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 mins
    enabled: isLoggedIn
  })
  
  const navItems = [
    { label: 'Home', path: '/', icon: LayoutGrid },
    { label: 'Library', path: '/library', icon: Library },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Studio', path: '/manage', icon: FolderKanban },
    { label: 'Settings', path: '/profile', icon: User },
  ]

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: BrainCircuit })
  }

  const isLandingPage = location.pathname === '/' && !isLoggedIn
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isLoggedIn 
        ? (isDashboard ? "pb-24 md:pb-0 md:min-h-0 md:h-screen md:w-screen md:overflow-hidden" : "pb-24 md:pb-0")
        : ""
    )}>

      {/* Desktop Header */}
      {!isLandingPage && (
        <header className={cn(
          "fixed top-0 left-0 right-0 z-[110] backdrop-blur-2xl border-b px-8 py-4 hidden md:flex items-center justify-between transition-all duration-300",
          isLoggedIn 
            ? "bg-white/80 border-slate-100 text-slate-900" 
            : "bg-slate-950/80 border-white/5 text-white"
        )}>
          <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className={cn(
              "text-xl font-black tracking-tighter uppercase",
              isLoggedIn ? "text-slate-800" : "text-white"
            )}>
              Voca<span className="text-orange-500">burn</span>
            </span>
          </Link>
          {isLoggedIn && (
            <nav className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                    location.pathname === item.path ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        
        {isLoggedIn ? (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-4 border-r border-slate-100 pr-5">
              <span className="flex items-center gap-1 text-orange-500 hover:scale-105 transition-transform" title="Daily Streak">
                <Flame className="w-4 h-4 fill-orange-500" />
                <span className="text-xs font-black">{gamify.streak}d</span>
              </span>
              <span className="flex items-center gap-1 text-amber-500 hover:scale-105 transition-transform" title="Level">
                <Award className="w-4 h-4" />
                <span className="text-xs font-black">Lvl {gamify.level}</span>
              </span>
            </div>

            <Link to="/profile" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="text-right hidden lg:block">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Logged In</p>
                <p className="text-[11px] font-black text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">{user?.username || 'GUEST'}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-all">
                <User className="w-4.5 h-4.5" />
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              to="/login"
              className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              Sign In
            </Link>
            {authConfig?.sso_enabled ? (
              <a
                href={authConfig.jump_url ? authConfig.jump_url.replace('/api/auth/jump/', '/auth/register?client_id=') : 'http://localhost:5000/auth/register?client_id=vocaburn-v1'}
                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Sign Up
              </a>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Sign Up
              </Link>
            )}
          </div>
        )}
      </header>
      )}

      <main className={cn(
        "flex-1 w-full",
        isLoggedIn 
          ? (isDashboard ? "pt-0 md:pt-20 md:h-full md:overflow-hidden" : "pt-0 md:pt-20")
          : ""
      )}>
        <Outlet />
      </main>

      {/* RemiNote-Style Mobile Bottom Nav */}
      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 py-3">
          <nav className="flex items-center justify-between max-w-md mx-auto h-16">
            {navItems.filter(item => item.label !== 'Admin').map((item, idx) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className="relative flex items-center justify-center w-14 h-14"
                >
                  {isActive && (
                    <motion.div 
                      layoutId="navActiveSquircle"
                      className="absolute inset-0 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-200"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={cn(
                    "w-6 h-6 relative z-10 transition-all duration-300",
                    isActive ? "text-white scale-110" : "text-slate-400"
                  )} />
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
