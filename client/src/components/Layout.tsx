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
    const strokeColor = isActive ? '#EA580C' : '#94A3B8'
    const fillColor = isActive ? '#FED7AA' : 'transparent'
    if (label === 'Home') {
      return (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-transform duration-200" fill="none">
          <path
            d="M3.5 10.2L11.1 4.1C11.6 3.7 12.4 3.7 12.9 4.1L20.5 10.2C20.8 10.5 21 10.9 21 11.4V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V11.4C3 10.9 3.2 10.5 3.5 10.2Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isActive ? 2.1 : 1.8}
            strokeLinejoin="round"
          />
          <path
            d="M9.5 21V15.5C9.5 14.7 10.2 14 11 14H13C13.8 14 14.5 14.7 14.5 15.5V21"
            stroke={strokeColor}
            strokeWidth={isActive ? 2.1 : 1.8}
            strokeLinecap="round"
          />
        </svg>
      )
    }
    if (label === 'Decks') {
      return (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-transform duration-200" fill="none">
          <rect
            x="6"
            y="4"
            width="14"
            height="14"
            rx="3.2"
            transform="rotate(6 13 11)"
            fill={isActive ? '#FFEDD5' : 'none'}
            stroke={strokeColor}
            strokeWidth={isActive ? 1.8 : 1.6}
          />
          <rect
            x="4"
            y="6"
            width="14"
            height="14"
            rx="3.2"
            fill={isActive ? '#FDBA74' : '#FFFFFF'}
            stroke={strokeColor}
            strokeWidth={isActive ? 2.1 : 1.8}
          />
          <path
            d="M7.5 11.5H14.5M7.5 14.8H11.8"
            stroke={isActive ? '#C2410C' : strokeColor}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      )
    }
    if (label === 'Stats') {
      return (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-transform duration-200" fill="none">
          <rect
            x="3.5"
            y="12.5"
            width="4.2"
            height="7.5"
            rx="1.5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isActive ? 2 : 1.75}
          />
          <rect
            x="9.9"
            y="5"
            width="4.2"
            height="15"
            rx="1.5"
            fill={isActive ? '#FB923C' : 'none'}
            stroke={strokeColor}
            strokeWidth={isActive ? 2 : 1.75}
          />
          <rect
            x="16.3"
            y="9"
            width="4.2"
            height="11"
            rx="1.5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isActive ? 2 : 1.75}
          />
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-transform duration-200" fill="none">
        <path
          d="M4 7H9M13 7H20M4 12H15M19 12H20M4 17H7M11 17H20"
          stroke={strokeColor}
          strokeWidth={isActive ? 2.1 : 1.8}
          strokeLinecap="round"
        />
        <circle cx="11" cy="7" r="2.2" fill={isActive ? '#F97316' : '#FFFFFF'} stroke={strokeColor} strokeWidth="2" />
        <circle cx="17" cy="12" r="2.2" fill={isActive ? '#F97316' : '#FFFFFF'} stroke={strokeColor} strokeWidth="2" />
        <circle cx="9" cy="17" r="2.2" fill={isActive ? '#F97316' : '#FFFFFF'} stroke={strokeColor} strokeWidth="2" />
      </svg>
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

      {/* Flagship Custom-Duotone Mobile Bottom Nav */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] px-3 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
                    "relative flex flex-col items-center justify-center h-full rounded-2xl select-none transition-all duration-150 cursor-pointer active:scale-90 outline-none focus:outline-none focus-visible:outline-none",
                    isActive ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <div className={cn("transition-transform duration-200", isActive ? "-translate-y-0.5 scale-105" : "")}>
                    {renderMobileNavIcon(item.label, isActive)}
                  </div>
                  <span className={cn(
                    "text-[10px] tracking-tight mt-0.5 transition-colors duration-150 leading-none",
                    isActive 
                      ? "font-extrabold text-orange-600 dark:text-orange-400" 
                      : "font-semibold text-slate-400 dark:text-slate-500"
                  )}>
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "w-1 h-1 rounded-full bg-orange-500 mt-0.5 transition-all duration-200",
                      isActive ? "opacity-100 scale-100 shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "opacity-0 scale-0"
                    )}
                  />
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
