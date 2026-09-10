import { useRef, useState } from 'react'
import axios from 'axios'
import { speakWithEdgeTTS, speakEdgeTTSSequentially, registerAudioElement, cancelAllAudio } from '@/lib/audio'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
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
  const playSeqRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const inFlightGenMapRef = useRef<Map<string, Promise<string>>>(new Map())

  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const stopAllAudio = () => {
    playSeqRef.current++
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch (e) {}
      abortControllerRef.current = null
    }
    cancelAllAudio()
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
        activeAudioRef.current.currentTime = 0
      } catch (e) {}
      activeAudioRef.current = null
    }
    setIsLoadingAudio(false)
    setIsPlayingAudio(false)
  }

  const playCardAudio = async (face: string = 'front', rate: number = 1.0) => {
    if (!currentQuestion) return
    const targetQuestionId = currentQuestion.id
    currentQuestionIdRef.current = targetQuestionId

    stopAllAudio()
    const currentSeq = ++playSeqRef.current

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
      setIsLoadingAudio(true)
      const genKey = `${targetQuestionId}_${face}`
      let genPromise = inFlightGenMapRef.current.get(genKey)

      if (!genPromise) {
        const controller = new AbortController()
        abortControllerRef.current = controller

        genPromise = (async () => {
          try {
            const res = await axios.get(
              `/api/v1/deck/generate-audio/${targetQuestionId}?face=${encodeURIComponent(face)}`,
              { signal: controller.signal }
            );
            return res.data?.url || ''
          } catch (err: any) {
            if (axios.isCancel(err) || err?.name === 'CanceledError') {
              return ''
            }
            console.error(`[TTS SERVER ERROR] Backend failed to synthesize ${face} audio for question ${targetQuestionId}:`, err?.message)
            return ''
          } finally {
            inFlightGenMapRef.current.delete(genKey)
          }
        })()

        inFlightGenMapRef.current.set(genKey, genPromise)
      }

      try {
        audioUrl = await genPromise
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
      } catch (e) {
        // Ignored
      } finally {
        if (playSeqRef.current === currentSeq) {
          setIsLoadingAudio(false)
        }
      }
    }

    if (playSeqRef.current !== currentSeq) {
      return
    }
    if (currentQuestionIdRef.current !== targetQuestionId) {
      return
    }

    if (audioUrl) {
      const resolvedUrl = resolveMediaUrl(audioUrl) || audioUrl
      const cacheBustedUrl = `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      const audio = new Audio(cacheBustedUrl)
      audio.playbackRate = rate
      registerAudioElement(audio)
      activeAudioRef.current = audio

      setIsPlayingAudio(true)
      audio.onended = () => {
        if (playSeqRef.current === currentSeq) {
          setIsPlayingAudio(false)
        }
      }
      audio.onerror = () => {
        if (playSeqRef.current === currentSeq) {
          setIsPlayingAudio(false)
        }
      }

      audio.play().catch(err => {
        if (playSeqRef.current === currentSeq) {
          setIsPlayingAudio(false)
        }
        console.warn(`[TTS FALLBACK] Playback failed: ${cacheBustedUrl}`, err?.message)
        if (err?.name !== 'NotAllowedError' && script && script.trim()) {
          if (playSeqRef.current === currentSeq) {
            speakWithEdgeTTS(script, pair?.lang)
          }
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
    stopAllAudio,
    isLoadingAudio,
    isPlayingAudio
  }
}
