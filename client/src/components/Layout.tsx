import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Home, Layers, PieChart, Settings, BrainCircuit, Flame, Award, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { VocaburnLogo } from './VocaburnLogo'
import { ShopModal } from './ShopModal'

export default function Layout() {
  const { user, userSettings, gamify, setUser, setGamify, isLoggedIn, authConfig } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false)

  // Synchronize Dark Mode with user global settings
  useEffect(() => {
    if (userSettings?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [userSettings?.theme])

  // Ensure data is loaded even if we land on subpages (only if logged in)
  const { data, refetch } = useQuery({
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
    { label: 'Home', path: '/', icon: Home },
    { label: 'Decks', path: '/decks', icon: Layers },
    { label: 'Stats', path: '/stats', icon: PieChart },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: BrainCircuit })
  }

  const isLandingPage = location.pathname === '/' && !isLoggedIn
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isFullscreenPlay = location.pathname.includes('/play') || 
                          location.pathname.includes('/practice/')
  const isDeckDetail = /^\/decks\/[^/]+$/.test(location.pathname)
  const isImmersiveView = isFullscreenPlay || isDeckDetail
  const showDesktopHeader = !isLandingPage && !isFullscreenPlay
  const showBottomNav = isLoggedIn && !isImmersiveView

  const renderMobileNavIcon = (label: string, isActive: boolean) => {
    if (label === 'Home') {
      return isActive ? (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12.97 2.59a1.5 1.5 0 0 0-1.94 0l-7.5 6.36A1.5 1.5 0 0 0 3 10.1V19.5A2.5 2.5 0 0 0 5.5 22h3.75a.75.75 0 0 0 .75-.75v-5.25a2 2 0 0 1 4 0v5.25c0 .41.34.75.75.75H18.5A2.5 2.5 0 0 0 21 19.5V10.1a1.5 1.5 0 0 0-.53-1.15l-7.5-6.36Z" />
        </svg>
      ) : (
        <Home className="w-6 h-6 stroke-[1.85]" />
      )
    }
    if (label === 'Decks') {
      return isActive ? (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M7 3.75A1.75 1.75 0 0 1 8.75 2h8A3.25 3.25 0 0 1 20 5.25v10A1.75 1.75 0 0 1 18.25 17H18V7.25A3.25 3.25 0 0 0 14.75 4H7v-.25Z" opacity="0.4" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M4 8.25A2.25 2.25 0 0 1 6.25 6h8.5A2.25 2.25 0 0 1 17 8.25v11.5A2.25 2.25 0 0 1 14.75 22h-8.5A2.25 2.25 0 0 1 4 19.75V8.25Zm3.5 3.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Zm0 3.75a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z"
          />
        </svg>
      ) : (
        <Layers className="w-6 h-6 stroke-[1.85]" />
      )
    }
    if (label === 'Stats') {
      return isActive ? (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <rect x="3" y="11.5" width="4.5" height="9" rx="1.5" />
          <rect x="9.75" y="4" width="4.5" height="16.5" rx="1.5" />
          <rect x="16.5" y="8" width="4.5" height="12.5" rx="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="12" width="4" height="8" rx="1.2" />
          <rect x="10" y="4.5" width="4" height="15.5" rx="1.2" />
          <rect x="16.5" y="8.5" width="4" height="11.5" rx="1.2" />
        </svg>
      )
    }
    return (
      <Settings className={cn("w-6 h-6", isActive ? "stroke-[2.4]" : "stroke-[1.85]")} />
    )
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isLoggedIn 
        ? (isImmersiveView
            ? "pb-0 h-screen h-[100dvh] overflow-hidden" 
            : "pb-28 md:pb-0 md:h-screen md:w-screen md:overflow-hidden")
        : ""
    )}>

      {/* Desktop Header */}
      {showDesktopHeader && (
        <header className={cn(
          "fixed top-0 left-0 right-0 z-[110] border-b hidden md:flex items-center transition-all duration-300",
          isLoggedIn 
            ? "bg-white border-slate-200/90 text-slate-900 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.06)]" 
            : "bg-slate-950/80 border-white/5 text-white"
        )}>
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5 short:py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-6 lg:gap-8">
              <Link to="/" className="active:scale-95 transition-all flex items-center shrink-0">
                <VocaburnLogo height="md" />
              </Link>
              {isLoggedIn && (
                <nav className="flex items-center p-1 bg-slate-100 border border-slate-200/90 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] gap-0.5 sm:gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.path === '/' 
                      ? (location.pathname === '/' || location.pathname === '/dashboard')
                      : location.pathname.startsWith(item.path)
                    return (
                      <Link 
                        key={item.path}
                        to={item.path} 
                        className={cn(
                          "relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] lg:text-sm tracking-tight transition-all duration-200 select-none group cursor-pointer",
                          isActive 
                            ? "text-orange-600 font-extrabold" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="desktopNavActive"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/90"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          <Icon className={cn(
                            "w-4 h-4 transition-all duration-200 group-hover:scale-110",
                            isActive 
                              ? "text-orange-500 fill-orange-500/20 stroke-[2.2]" 
                              : "text-slate-400 group-hover:text-slate-600 stroke-[1.8]"
                          )} />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>
            
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50/80 border border-orange-200/90 rounded-xl shadow-2xs">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="text-xs font-black text-orange-800">{gamify.streak}</span>
                </div>

                {/* Level / XP Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/90 rounded-xl shadow-2xs">
                  <Award className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                  <span className="text-xs font-black text-indigo-800">Lv.{gamify.level}</span>
                </div>

                {/* Shop Button */}
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100/90 border border-pink-200/90 rounded-xl text-xs font-black text-pink-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Shop & Inventory"
                >
                  <ShoppingBag className="w-4 h-4 text-pink-500 stroke-[2.2]" />
                  <span>Shop</span>
                </button>

                {/* User Info / Avatar */}
                <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity">
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-xs ring-2 ring-slate-100">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 max-w-[120px] truncate hidden lg:inline">
                    {user?.username || 'User'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
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
          </div>
        </header>
      )}

      <main className={cn(
        "flex-1 w-full min-h-0",
        isLoggedIn 
          ? (isFullscreenPlay 
              ? "pt-0 h-full overflow-hidden" 
              : "pt-0 md:pt-[60px] short:md:pt-[52px] md:h-full md:min-h-0 md:overflow-hidden")
          : ""
      )}>
        <Outlet />
      </main>

      {/* Modern Flat Mobile Bottom Bar */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <nav className="grid grid-cols-4 items-center w-full max-w-md mx-auto h-[48px]">
            {navItems.filter(item => item.label !== 'Admin').map((item) => {
              const isActive = item.path === '/' 
                ? (location.pathname === '/' || location.pathname === '/dashboard')
                : location.pathname.startsWith(item.path)
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={cn(
                    "flex flex-col items-center justify-center h-full select-none transition-colors duration-150 cursor-pointer active:opacity-70 outline-none focus:outline-none focus-visible:outline-none",
                    isActive ? "text-orange-500 dark:text-orange-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  {renderMobileNavIcon(item.label, isActive)}
                  <span className={cn(
                    "text-[10.5px] tracking-tight mt-0.5 leading-none",
                    isActive 
                      ? "font-bold text-orange-500 dark:text-orange-400" 
                      : "font-medium text-slate-400 dark:text-slate-500"
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Shop & Inventory Modal */}
      <ShopModal 
        isOpen={isShopOpen} 
        onClose={() => setIsShopOpen(false)} 
        onPurchaseSuccess={() => refetch()} 
      />
    </div>
  )
}
