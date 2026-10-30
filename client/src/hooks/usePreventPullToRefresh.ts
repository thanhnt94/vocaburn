import { useEffect, useRef } from 'react'

export interface PreventPullToRefreshOptions {
  isOpen: boolean
  drawerRef?: React.RefObject<HTMLElement | null>
  backdropRef?: React.RefObject<HTMLElement | null>
  onClose?: () => void
}

/**
 * usePreventPullToRefresh
 * 
 * 1. While modal/sheet is OPEN:
 *    - Sets `overscroll-behavior: none` on `body` & `html`.
 *    - Captures native `touchstart` on window.
 *    - Intercepts native non-passive `touchmove` on window:
 *      If user pulls downward (`deltaY > 0`):
 *      - If touching outside drawer (backdrop/handle/header) -> e.preventDefault().
 *      - If touching inside drawer and drawer is at top (`scrollTop <= 0`) -> e.preventDefault().
 *    - On `touchend`:
 *      If downward swipe threshold met (`deltaY > 50` or fast flick `deltaY > 25 && velocity > 0.3`),
 *      triggers `onClose?.()` to dismiss the sheet cleanly without ANY browser reload!
 * 2. When modal/sheet is CLOSED:
 *    - Restores `overscroll-behavior: auto` on `body` & `html` so user can pull-to-refresh normally.
 */
export function usePreventPullToRefresh({
  isOpen,
  drawerRef,
  backdropRef,
  onClose,
}: PreventPullToRefreshOptions) {
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overscrollBehavior = 'auto'
      document.body.style.overscrollBehaviorY = 'auto'
      document.documentElement.style.overscrollBehavior = 'auto'
      document.documentElement.style.overscrollBehaviorY = 'auto'
      return
    }

    // Lock overscroll on open
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overscrollBehaviorY = 'none'
    document.documentElement.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehaviorY = 'none'

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchStartYRef.current = e.touches[0].clientY
        touchStartTimeRef.current = Date.now()
      }
    }

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || !e.touches || !e.touches[0]) return
      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartYRef.current

      // User is pulling downward
      if (deltaY > 0) {
        const target = e.target as Node | null
        const drawerEl = drawerRef?.current

        // If dragging inside the scrollable drawer
        if (drawerEl && target && drawerEl.contains(target)) {
          // If drawer is at or past top, prevent browser pull-to-refresh
          if (drawerEl.scrollTop <= 0 && e.cancelable) {
            e.preventDefault()
          }
        } else {
          // Touching backdrop or header/outside -> prevent browser reload
          if (e.cancelable) {
            e.preventDefault()
          }
        }
      }
    }

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (touchStartYRef.current !== null && onClose && e.changedTouches && e.changedTouches[0]) {
        const changedTouch = e.changedTouches[0]
        const currentY = changedTouch.clientY
        const deltaY = currentY - touchStartYRef.current
        const duration = Math.max(1, Date.now() - touchStartTimeRef.current)
        const velocity = deltaY / duration

        const target = e.target as Node | null
        const drawerEl = drawerRef?.current
        const isInsideDrawer = Boolean(drawerEl && target && drawerEl.contains(target))

        // Trigger onClose if pulling down on backdrop/header OR inside drawer when at top
        if (!isInsideDrawer || (drawerEl && drawerEl.scrollTop <= 0)) {
          if (deltaY > 50 || (deltaY > 25 && velocity > 0.3)) {
            onClose()
          }
        }
      }
      touchStartYRef.current = null
    }

    // Attach native window listeners with passive: false to allow e.preventDefault()
    window.addEventListener('touchstart', handleNativeTouchStart, { passive: true })
    window.addEventListener('touchmove', handleNativeTouchMove, { passive: false })
    window.addEventListener('touchend', handleNativeTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleNativeTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleNativeTouchStart)
      window.removeEventListener('touchmove', handleNativeTouchMove)
      window.removeEventListener('touchend', handleNativeTouchEnd)
      window.removeEventListener('touchcancel', handleNativeTouchEnd)

      // Restore overscroll on close
      document.body.style.overscrollBehavior = 'auto'
      document.body.style.overscrollBehaviorY = 'auto'
      document.documentElement.style.overscrollBehavior = 'auto'
      document.documentElement.style.overscrollBehaviorY = 'auto'
    }
  }, [isOpen, drawerRef, backdropRef, onClose])
}

export default usePreventPullToRefresh

