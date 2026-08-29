import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TimerWidgetProps {
  timeMode: 'card' | 'today' | 'all'
  initialTodayTime: number
  initialAllTimeTime: number
  showFeedback: boolean
  hasRated: boolean
  mainTab: 'fsrs' | 'practice'
  currentIndex: number
  timeLeftRef: React.MutableRefObject<number>
  sessionStudyTimeRef: React.MutableRefObject<number>
  formatHeaderTime: (secs: number) => string
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  timeMode,
  initialTodayTime,
  initialAllTimeTime,
  showFeedback,
  hasRated,
  mainTab,
  currentIndex,
  timeLeftRef,
  sessionStudyTimeRef,
  formatHeaderTime
}) => {
  const [localTimeLeft, setLocalTimeLeft] = useState(0)
  const [localSessionStudyTime, setLocalSessionStudyTime] = useState(0)

  // Reset the card timer when the index changes
  useEffect(() => {
    setLocalTimeLeft(0)
    timeLeftRef.current = 0
  }, [currentIndex, timeLeftRef])

  // Sync state to ref
  useEffect(() => {
    timeLeftRef.current = localTimeLeft
  }, [localTimeLeft, timeLeftRef])

  useEffect(() => {
    sessionStudyTimeRef.current = localSessionStudyTime
  }, [localSessionStudyTime, sessionStudyTimeRef])

  // Ticking logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !document.hasFocus()) return
      if (mainTab === 'practice') {
        if (showFeedback) return
      } else {
        if (hasRated) return
      }
      setLocalTimeLeft(prev => prev + 1)
      setLocalSessionStudyTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [showFeedback, hasRated, mainTab])

  const displayTime = useMemo(() => {
    if (timeMode === 'card') {
      return `${localTimeLeft}s`
    }
    const baseTime = timeMode === 'today' ? initialTodayTime : initialAllTimeTime
    return formatHeaderTime(baseTime + localSessionStudyTime)
  }, [timeMode, localTimeLeft, localSessionStudyTime, initialTodayTime, initialAllTimeTime, formatHeaderTime])

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={displayTime}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 18 }}
        className="text-[7.5px] md:text-[8.5px] font-black text-slate-700 leading-none block truncate"
      >
        {displayTime}
      </motion.span>
    </AnimatePresence>
  )
}
