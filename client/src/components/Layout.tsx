import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutGrid, Compass, BarChart3, User, BrainCircuit, Bell, Settings, Plus, Library, Users, FolderKanban, BookOpen, Flame, Award, Sparkles, Shield, Zap, ShoppingBag } from 'lucide-react'
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

  const handleNavClick = (e: React.MouseEvent, path: string, label: string) => {
    if (label === 'Roadmap') {
      e.preventDefault()
      navigate('/roadmap')
    }
  }

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
    { label: 'Trang chủ', path: '/', icon: LayoutGrid },
    { label: 'Lộ trình', path: '/roadmap', icon: Compass },
    { label: 'Thư viện', path: '/library', icon: BookOpen },
    { label: 'Bộ thẻ', path: '/manage', icon: FolderKanban },
    { label: 'Thống kê', path: '/stats', icon: BarChart3 },
    { label: 'Cài đặt', path: '/settings', icon: Settings },
  ]

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: BrainCircuit })
  }

  const isLandingPage = location.pathname === '/' && !isLoggedIn
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isFullscreenPlay = location.pathname.includes('/play') || 
                          location.pathname.includes('/practice/') || 
                          location.pathname.includes('/room/')
  const isManageEdit = location.pathname.includes('/manage/edit') || location.pathname.includes('/flashcards')
  const showDesktopHeader = !isLandingPage && !isFullscreenPlay && !isManageEdit
  const showBottomNav = isLoggedIn && !isFullscreenPlay && !isManageEdit

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isLoggedIn 
        ? (isFullscreenPlay
            ? "pb-0 h-screen h-[100dvh] overflow-hidden" 
            : (isDashboard 
                ? "pb-20 md:pb-0 md:min-h-0 md:h-screen md:w-screen md:overflow-hidden" 
                : (isManageEdit ? "pb-0" : "pb-20 md:pb-0")))
        : ""
    )}>

      {/* Desktop Header */}
      {showDesktopHeader && (
        <header className={cn(
          "fixed top-0 left-0 right-0 z-[110] backdrop-blur-2xl border-b hidden md:flex items-center transition-all duration-300",
          isLoggedIn 
            ? "bg-white/90 border-slate-100/80 text-slate-900 shadow-2xs" 
            : "bg-slate-950/80 border-white/5 text-white"
        )}>
          <div className="max-w-[1600px] w-full mx-auto px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="active:scale-95 transition-all">
                <VocaburnLogo iconSize="lg" textSize="lg" variant={isLoggedIn ? 'dark' : 'light'} />
              </Link>
              {isLoggedIn && (
                <nav className="flex items-center gap-2">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <Link 
                        key={item.path}
                        to={item.path} 
                        onClick={(e) => handleNavClick(e, item.path, item.label)}
                        className={cn(
                          "text-[11px] font-bold tracking-wide transition-all px-3 py-1.5 rounded-xl",
                          isActive 
                            ? "text-indigo-600 bg-indigo-50/80 font-black" 
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>
            
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50/80 border border-orange-200/60 rounded-xl">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="text-xs font-black text-orange-700">{gamify.streak}</span>
                </div>

                {/* Level / XP Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200/60 rounded-xl">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-indigo-700">Lv.{gamify.level}</span>
                </div>

                {/* Shop Button */}
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50/80 hover:bg-pink-100/80 border border-pink-200/60 rounded-xl text-xs font-black text-pink-700 transition-all active:scale-95 cursor-pointer"
                  title="Cửa hàng & Kho đồ"
                >
                  <ShoppingBag className="w-4 h-4 text-pink-500" />
                  <span>Shop</span>
                </button>

                {/* User Info / Avatar */}
                <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-700 max-w-[120px] truncate hidden lg:inline">
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
        "flex-1 w-full",
        isLoggedIn 
          ? (isDashboard 
              ? "pt-0 md:pt-20 md:h-full md:overflow-hidden" 
              : (isFullscreenPlay 
                  ? "pt-0 h-full overflow-hidden" 
                  : (isManageEdit ? "pt-0" : "pt-0 md:pt-20")))
          : ""
      )}>
        <Outlet />
      </main>

      {/* RemiNote-Style Mobile Bottom Nav */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-4 py-1.5">
          <nav className="flex items-center justify-between max-w-md mx-auto h-12">
            {navItems.filter(item => item.label !== 'Admin').map((item, idx) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  onClick={(e) => handleNavClick(e, item.path, item.label)}
                  className="relative flex items-center justify-center w-11 h-11"
                >
                  {isActive && (
                    <motion.div 
                      layoutId="navActiveSquircle"
                      className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-[1.25rem] shadow-lg shadow-orange-500/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={cn(
                    "w-5 h-5 relative z-10 transition-all duration-300",
                    isActive ? "text-white scale-110" : "text-slate-400"
                  )} />
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
