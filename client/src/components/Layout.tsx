import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Home, Layers, PieChart, Settings, BrainCircuit, Flame, Award, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { VocaburnLogo } from './VocaburnLogo'
import { ShopModal } from './ShopModal'

export default function Layout() {
  const { user, gamify, setUser, setGamify, isLoggedIn, authConfig } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false)

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
                          location.pathname.includes('/practice/') || 
                          location.pathname.includes('/room/')
  const showDesktopHeader = !isLandingPage && !isFullscreenPlay
  const showBottomNav = isLoggedIn && !isFullscreenPlay

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isLoggedIn 
        ? (isFullscreenPlay
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
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5 flex items-center justify-between">
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
                  title="Cửa hàng & Kho đồ"
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
              : "pt-0 md:pt-[60px] md:h-full md:min-h-0 md:overflow-hidden")
          : ""
      )}>
        <Outlet />
      </main>

      {/* Reference-Styled Mobile Bottom Nav (Flat rectangular, Clean, Top Active Indicator Line) */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white border-t border-slate-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.04)] px-2 pt-0 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
          <nav className="grid grid-cols-4 items-center w-full max-w-md mx-auto">
            {navItems.filter(item => item.label !== 'Admin').map((item) => {
              const Icon = item.icon
              const isActive = item.path === '/' 
                ? (location.pathname === '/' || location.pathname === '/dashboard')
                : location.pathname.startsWith(item.path)
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className="relative flex flex-col items-center justify-center pt-2.5 pb-1 select-none transition-colors duration-200 cursor-pointer"
                >
                  {/* Top Active Line Indicator (Smooth Animated) */}
                  {isActive && (
                    <motion.div 
                      layoutId="navTopIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}

                  {/* Clean Icon (Filled when Active) */}
                  <Icon className={cn(
                    "w-5.5 h-5.5 transition-all duration-200",
                    isActive 
                      ? "text-orange-500 fill-orange-500 stroke-[1.5]" 
                      : "text-slate-400 stroke-[1.75]"
                  )} />

                  {/* Website-Synchronized Font & Typography */}
                  <span className={cn(
                    "text-[11px] tracking-tight mt-1 transition-colors duration-200 leading-none",
                    isActive 
                      ? "font-black text-orange-500" 
                      : "font-bold text-slate-400"
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
