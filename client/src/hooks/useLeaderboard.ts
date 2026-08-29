import { useState, useEffect } from 'react'
import axios from 'axios'

export type LeaderboardTimeFilter = 'today' | 'week' | 'month' | 'all_time'
export type LeaderboardType = 'xp' | 'streak' | 'questions' | 'accuracy'

export function useLeaderboard() {
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<LeaderboardTimeFilter>('week')
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('xp')
  const [leaderboardData, setLeaderboardData] = useState<any>(null)
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false)

  const xpLeaderboard = leaderboardData?.[leaderboardType] || { list: [], user_rank: -1, user_value: 0 }
  const userRank = xpLeaderboard.user_rank
  const userValue = xpLeaderboard.user_value

  const getUnitName = (type: string) => {
    if (type === 'xp') return 'XP'
    if (type === 'streak') return 'ngày'
    if (type === 'questions') return 'câu'
    return '%'
  }

  let leaderboardMsg = ""
  if (userRank === 1) {
    leaderboardMsg = "Bạn đang dẫn đầu Bảng xếp hạng! Hãy giữ vững ngôi vương nhé! 👑"
  } else if (userRank > 1) {
    const topUser = xpLeaderboard.list[0]
    const prevUser = xpLeaderboard.list[userRank - 2]
    const unit = getUnitName(leaderboardType)
    if (topUser) {
      const xpToTop = topUser.value - userValue
      leaderboardMsg = `Cần thêm ${xpToTop.toLocaleString()} ${unit} nữa để đạt Top 1! 🚀`
    }
    if (prevUser) {
      const xpToPrev = prevUser.value - userValue
      leaderboardMsg += ` Cách Hạng #${userRank - 1} (${prevUser.username}) ${xpToPrev.toLocaleString()} ${unit}! 💪`
    }
  } else {
    leaderboardMsg = `Hãy tích lũy thêm ${getUnitName(leaderboardType)} để ghi danh lên Bảng xếp hạng! 🏆`
  }

  const fetchLeaderboard = async (timeFilter = leaderboardTimeFilter) => {
    setIsLeaderboardLoading(true)
    try {
      const res = await axios.get('/api/v1/stats/leaderboard', {
        params: { time_filter: timeFilter }
      })
      setLeaderboardData(res.data)
      return res.data
    } catch (e) {
      console.error("Failed to load leaderboard data", e)
    } finally {
      setIsLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setIsLeaderboardLoading(true)
      try {
        const res = await axios.get('/api/v1/stats/leaderboard', {
          params: { time_filter: leaderboardTimeFilter }
        })
        if (isMounted) {
          setLeaderboardData(res.data)
        }
      } catch (e) {
        console.error("Failed to load leaderboard data", e)
      } finally {
        if (isMounted) {
          setIsLeaderboardLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [leaderboardTimeFilter])

  return {
    leaderboardTimeFilter,
    setLeaderboardTimeFilter,
    leaderboardType,
    setLeaderboardType,
    leaderboardData,
    setLeaderboardData,
    fetchLeaderboard,
    isLeaderboardLoading,
    xpLeaderboard,
    userRank,
    userValue,
    leaderboardMsg,
    getUnitName
  }
}
