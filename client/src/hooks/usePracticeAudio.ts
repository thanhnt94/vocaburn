import { useRef } from 'react'
import axios from 'axios'
import { speakWithEdgeTTS, speakEdgeTTSSequentially } from '@/lib/audio'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface UsePracticeAudioProps {
  currentQuestion: Question | null
  session: any
  currentPracticeData?: PracticeQuestionData | null
}

export function usePracticeAudio({
  currentQuestion,
  session,
  currentPracticeData
}: UsePracticeAudioProps) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentQuestionIdRef = useRef<number | null>(null)

  const stopAllAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  const playCardAudio = async (face: string) => {
    if (!currentQuestion) return
    const targetQuestionId = currentQuestion.id
    currentQuestionIdRef.current = targetQuestionId

    stopAllAudio()

    const qAny = currentQuestion as any
    const pairs = session?.practice_settings?.audio_pairs || session?.creator_settings?.audio_pairs || []
    const pair = pairs.find((p: any) => p.text_col === face)

    let audioUrl = ''
    let script = ''

    if (face === 'front') {
      audioUrl = qAny.audio || qAny.front_audio_url || qAny.others?.front_audio_url || ''
      script = qAny.front_audio_content || qAny.others?.front_audio_content || qAny.content || ''
    } else if (face === 'back') {
      audioUrl = qAny.back_audio_url || qAny.others?.back_audio_url || ''
      script = qAny.back_audio_content || qAny.others?.back_audio_content || qAny.explanation || ''
    } else {
      if (pair) {
        const urlCol = pair.audio_url_col
        const contentCol = pair.audio_content_col
        if (urlCol) audioUrl = qAny[urlCol] || qAny.others?.[urlCol] || ''
        if (contentCol) script = qAny[contentCol] || qAny.others?.[contentCol] || ''
      }
      if (!script || !script.trim()) {
        script = qAny[face] || qAny.others?.[face] || ''
      }
      if (!audioUrl && pair && pair.audio_url_col) {
        audioUrl = qAny[pair.audio_url_col] || qAny.others?.[pair.audio_url_col] || ''
      }
    }

    // Lazily generate audio if it is not yet created on backend
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      try {
        const res = await axios.get(`/api/v1/deck/generate-audio/${currentQuestion.id}?face=${encodeURIComponent(face)}`)
        if (currentQuestionIdRef.current !== targetQuestionId) {
          return
        }
        audioUrl = res.data.url
        if (audioUrl) {
          if (face === 'front') {
            currentQuestion.audio = audioUrl
          } else if (face === 'back') {
            if (!currentQuestion.others) currentQuestion.others = {}
            currentQuestion.others.back_audio_url = audioUrl
          } else if (pair && pair.audio_url_col) {
            if (!currentQuestion.others) currentQuestion.others = {}
            currentQuestion.others[pair.audio_url_col] = audioUrl
          }
        }
      } catch (err: any) {
        console.error(`[TTS SERVER ERROR] Backend failed to synthesize ${face} audio for question ${currentQuestion.id}:`, err?.message)
      }
    }

    if (audioUrl) {
      const cacheBustedUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      const audio = new Audio(cacheBustedUrl)
      activeAudioRef.current = audio
      audio.play().catch(err => {
        console.warn(`[TTS FALLBACK] Playback failed: ${cacheBustedUrl}`, err?.message)
        if (script && script.trim()) {
          speakWithEdgeTTS(script, pair?.lang)
        }
      })
    } else if (script && script.trim()) {
      speakWithEdgeTTS(script, pair?.lang)
    }
  }

  const speakPracticeQuestionAndAnswer = async () => {
    if (!currentPracticeData) return
    const qText = currentPracticeData.question || ''
    const aText = currentPracticeData.correct_answer || ''
    const qKey = currentPracticeData.question_key || 'front'
    const aKey = currentPracticeData.answer_key || 'back'

    const containsJp = (str: string) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)
    const containsVi = (str: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str)

    const detectLang = (str: string) => containsJp(str) ? 'ja-JP' : (containsVi(str) ? 'vi-VN' : 'en-US')

    const pairs = session?.practice_settings?.audio_pairs || session?.creator_settings?.audio_pairs || []
    const qPair = pairs.find((p: any) => p.text_col === qKey)
    const aPair = pairs.find((p: any) => p.text_col === aKey)

    stopAllAudio()

    const segments: { text: string; langCode: string }[] = []
    if (qText) segments.push({ text: qText, langCode: qPair?.lang || detectLang(qText) })
    if (aText) segments.push({ text: aText, langCode: aPair?.lang || detectLang(aText) })

    speakEdgeTTSSequentially(segments, 500)
  }

  return {
    activeAudioRef,
    playCardAudio,
    speakPracticeQuestionAndAnswer,
    stopAllAudio
  }
}
