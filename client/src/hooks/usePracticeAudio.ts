import { useRef, useState } from 'react'
import axios from 'axios'
import { speakWithEdgeTTS, speakEdgeTTSSequentially, registerAudioElement, cancelAllAudio, unlockAudio } from '@/lib/audio'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface ResolvedAudioConfig {
  dataCol: string
  sourceCol: string
  urlCol: string
  lang: string
  enabled: boolean
}

/**
 * Resolves the 3-column audio configuration (display column, TTS reading column, audio URL storage column)
 * from practiceSettings / audio_configs configured for the deck.
 */
export function resolveAudioConfig(
  face: string,
  practiceSettings: any
): ResolvedAudioConfig {
  const normFace = String(face || 'front').trim().toLowerCase()
  const audioConfigs = practiceSettings?.audio_configs || []

  let matched: any = null

  if (Array.isArray(audioConfigs) && audioConfigs.length > 0) {
    // 1. Direct match by display column (data_col) - highest priority
    matched = audioConfigs.find((c: any) => String(c.data_col || '').trim().toLowerCase() === normFace)
    // 2. Match by reading column (source_col)
    if (!matched) {
      matched = audioConfigs.find((c: any) =>
        String(c.source_col || c.audio_content_col || '').trim().toLowerCase() === normFace
      )
    }
    // 3. Match by URL column (url_col)
    if (!matched) {
      matched = audioConfigs.find((c: any) =>
        String(c.url_col || c.audio_url_col || '').trim().toLowerCase() === normFace
      )
    }
    // 4. Match by config id
    if (!matched) {
      matched = audioConfigs.find((c: any) => String(c.id || '').trim().toLowerCase() === normFace)
    }
    // Standard front / back fallbacks
    if (!matched) {
      if (normFace === 'front' && audioConfigs.length > 0) {
        matched = audioConfigs.find((c: any) => String(c.data_col || '').trim().toLowerCase() === 'front') || audioConfigs[0]
      } else if (normFace === 'back' && audioConfigs.length > 1) {
        matched = audioConfigs.find((c: any) => String(c.data_col || '').trim().toLowerCase() === 'back') || audioConfigs[1]
      }
    }
  }

  if (matched) {
    return {
      dataCol: matched.data_col || face,
      sourceCol: matched.source_col || matched.audio_content_col || face,
      urlCol: matched.url_col || matched.audio_url_col || (face === 'back' ? 'back_audio_url' : 'front_audio_url'),
      lang: matched.lang || 'multi',
      enabled: matched.enabled !== false && matched.lang !== 'none',
    }
  }

  // 2. Legacy / standard front_audio_config & back_audio_config
  if (normFace === 'front' && practiceSettings?.front_audio_config) {
    const fc = practiceSettings.front_audio_config
    return {
      dataCol: fc.data_col || 'front',
      sourceCol: fc.audio_content_col || 'front_audio_content',
      urlCol: fc.audio_url_col || 'front_audio_url',
      lang: fc.lang || 'multi',
      enabled: fc.lang !== 'none',
    }
  }
  if (normFace === 'back' && practiceSettings?.back_audio_config) {
    const bc = practiceSettings.back_audio_config
    return {
      dataCol: bc.data_col || 'back',
      sourceCol: bc.audio_content_col || 'back_audio_content',
      urlCol: bc.audio_url_col || 'back_audio_url',
      lang: bc.lang || 'multi',
      enabled: bc.lang !== 'none',
    }
  }

  // 3. Legacy audio_pairs
  const pairs = practiceSettings?.audio_pairs || []
  const pair = pairs.find((p: any) =>
    String(p.data_col || p.text_col || '').trim().toLowerCase() === normFace
  )
  if (pair) {
    return {
      dataCol: pair.data_col || pair.text_col || face,
      sourceCol: pair.audio_content_col || pair.text_col || face,
      urlCol: pair.audio_url_col || (face === 'back' ? 'back_audio_url' : 'front_audio_url'),
      lang: pair.lang || 'multi',
      enabled: pair.lang !== 'none',
    }
  }

  // 4. Default fallback
  const isBack = normFace === 'back'
  return {
    dataCol: face,
    sourceCol: isBack ? 'back_audio_content' : (face === 'front' ? 'front_audio_content' : face),
    urlCol: isBack ? 'back_audio_url' : (face === 'front' ? 'front_audio_url' : `${face}_audio_url`),
    lang: 'multi',
    enabled: true,
  }
}

/**
 * Helper to safely extract a field value from card or card.others using case-insensitive key comparison
 */
export function getCardFieldValue(card: any, colKey: string): string {
  if (!card || !colKey) return ''
  const val = card[colKey]
  if (val !== undefined && val !== null && String(val).trim()) {
    return String(val).trim()
  }
  if (card.others && typeof card.others === 'object') {
    if (card.others[colKey] !== undefined && card.others[colKey] !== null && String(card.others[colKey]).trim()) {
      return String(card.others[colKey]).trim()
    }
    const lowerKey = colKey.trim().toLowerCase()
    for (const [k, v] of Object.entries(card.others)) {
      if (k.trim().toLowerCase() === lowerKey && v !== undefined && v !== null && String(v).trim()) {
        return String(v).trim()
      }
    }
  }
  return ''
}

export interface UsePracticeAudioProps {
  currentQuestion: Question | null
  session?: any
  currentPracticeData?: PracticeQuestionData | null
  practiceSettings?: any
}

export function usePracticeAudio({
  currentQuestion,
  session,
  currentPracticeData,
  practiceSettings
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
    const effectiveSettings = practiceSettings || session?.practice_settings || session?.creator_settings || {}
    const cfg = resolveAudioConfig(face, effectiveSettings)

    if (!cfg.enabled) {
      console.log(`[AUDIO] Column '${face}' is disabled in audio settings. Skipping playback.`)
      return
    }

    // ── STEP 1: CHECK IF AUDIO URL ALREADY EXISTS (CACHE-FIRST) ──
    let audioUrl = getCardFieldValue(qAny, cfg.urlCol)

    // Check standard front / back aliases if still empty
    if (!audioUrl) {
      const normFace = face.trim().toLowerCase()
      if (normFace === 'front' || cfg.dataCol === 'front') {
        audioUrl = qAny.audio || qAny.front_audio_url || qAny.others?.front_audio_url || qAny.others?.audio || ''
      } else if (normFace === 'back' || cfg.dataCol === 'back') {
        audioUrl = qAny.back_audio_url || qAny.others?.back_audio_url || ''
      }
    }

    // ── STEP 2: EXTRACT READING TEXT (source_col) ──
    let script = getCardFieldValue(qAny, cfg.sourceCol)
    if (!script) {
      // Fallback to display column / face
      script = getCardFieldValue(qAny, cfg.dataCol) || getCardFieldValue(qAny, face)
    }
    if (!script) {
      if (face === 'front' || cfg.dataCol === 'front') {
        script = qAny.content || ''
      } else if (face === 'back' || cfg.dataCol === 'back') {
        script = qAny.explanation || ''
      }
    }

    // ── STEP 3: GENERATE AUDIO IF LINK IS MISSING ──
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      setIsLoadingAudio(true)
      const genKey = `${targetQuestionId}_${face}`
      let genPromise = inFlightGenMapRef.current.get(genKey)

      if (!genPromise) {
        const controller = new AbortController()
        abortControllerRef.current = controller

        genPromise = (async () => {
          try {
            console.log(`[AUDIO GENERATE] Requesting TTS generation for question ${targetQuestionId} (face: ${face}, sourceCol: ${cfg.sourceCol}, urlCol: ${cfg.urlCol})...`)
            const res = await axios.get(
              `/api/v1/deck/generate-audio/${targetQuestionId}?face=${encodeURIComponent(face)}`,
              { signal: controller.signal }
            )
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
          // Persist generated URL into currentQuestion so all subsequent plays are cache hits
          if (!currentQuestion.others) currentQuestion.others = {}
          if (cfg.urlCol) {
            currentQuestion.others[cfg.urlCol] = audioUrl
            ;(currentQuestion as any)[cfg.urlCol] = audioUrl
          }
          if (face === 'front' || cfg.dataCol === 'front') {
            currentQuestion.audio = audioUrl
            currentQuestion.front_audio_url = audioUrl
            currentQuestion.others.front_audio_url = audioUrl
          } else if (face === 'back' || cfg.dataCol === 'back') {
            currentQuestion.back_audio_url = audioUrl
            currentQuestion.others.back_audio_url = audioUrl
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

    // ── STEP 4: PLAYBACK ──
    if (audioUrl) {
      unlockAudio()
      const resolvedUrl = resolveMediaUrl(audioUrl) || audioUrl
      console.log(`[AUDIO PLAYBACK] Playing audio (column: ${face}, urlCol: ${cfg.urlCol}): ${resolvedUrl}`)
      const audio = new Audio(resolvedUrl)
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
        console.warn(`[TTS FALLBACK] File playback failed: ${resolvedUrl}`, err?.message)
        if (err?.name !== 'NotAllowedError' && script && script.trim()) {
          if (playSeqRef.current === currentSeq) {
            speakWithEdgeTTS(script, cfg.lang)
          }
        }
      })
    } else if (script && script.trim()) {
      console.log(`[TTS EDGE STREAM] Direct TTS stream for '${face}': "${script.substring(0, 30)}..."`)
      speakWithEdgeTTS(script, cfg.lang)
    }
  }

  const speakPracticeQuestionAndAnswer = async () => {
    if (!currentPracticeData) return
    const qText = currentPracticeData.question || ''
    const aText = currentPracticeData.correct_answer || ''
    const qKey = currentPracticeData.question_key || 'front'
    const rawAKey = currentPracticeData.answer_key || 'back'
    const aKey = Array.isArray(rawAKey) ? (rawAKey[0] || 'back') : rawAKey

    const containsJp = (str: string) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)
    const containsVi = (str: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str)
    const detectLang = (str: string) => containsJp(str) ? 'ja-JP' : (containsVi(str) ? 'vi-VN' : 'en-US')

    const effectiveSettings = practiceSettings || session?.practice_settings || session?.creator_settings || {}
    const qCfg = resolveAudioConfig(qKey, effectiveSettings)
    const aCfg = resolveAudioConfig(aKey, effectiveSettings)

    stopAllAudio()

    const segments: { text: string; langCode: string }[] = []
    if (qText && qCfg.enabled) segments.push({ text: qText, langCode: qCfg.lang !== 'multi' ? qCfg.lang : detectLang(qText) })
    if (aText && aCfg.enabled) segments.push({ text: aText, langCode: aCfg.lang !== 'multi' ? aCfg.lang : detectLang(aText) })

    if (segments.length > 0) {
      speakEdgeTTSSequentially(segments, 500)
    }
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
