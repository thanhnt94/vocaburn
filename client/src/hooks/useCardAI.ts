import { useState } from 'react'
import axios from 'axios'
import type { Question } from '@/types/flashcard'

export interface UseCardAIOptions {
  deckId: string | undefined
  session: any
  setSession: React.Dispatch<React.SetStateAction<any>>
  currentQuestion: Question | null
  currentIndex: number
}

export function useCardAI({
  deckId,
  session,
  setSession,
  currentQuestion,
  currentIndex
}: UseCardAIOptions) {
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [personalNote, setPersonalNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isEditingAI, setIsEditingAI] = useState(false)
  const [isEditingInsight, setIsEditingInsight] = useState(false)
  const [insightInput, setInsightInput] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState('')

  const fetchNote = async () => {
    if (!currentQuestion) return
    try {
      const res = await axios.get(`/api/v1/deck/question/${currentQuestion.id}/note`)
      setPersonalNote(res.data.content || '')
    } catch (e) {
      console.error("Failed to fetch card note:", e)
    }
  }

  const saveNote = async (content?: string) => {
    if (!currentQuestion) return
    const textToSave = typeof content === 'string' ? content : personalNote
    try {
      await axios.post(`/api/v1/deck/question/${currentQuestion.id}/note`, { content: textToSave })
      setPersonalNote(textToSave)
      setIsEditingNote(false)
    } catch (e) {
      alert("Failed to save note.")
    }
  }

  const askAI = async (field: string = "explanation", manualText?: string) => {
    if (!currentQuestion || !deckId) return
    setIsAskingAI(true)
    try {
      const payload: any = { question_id: currentQuestion.id, field }
      if (typeof manualText === 'string') {
        if (field === 'explanation') payload.ai_explanation = manualText
        else if (field === 'hint') payload.hint = manualText
        else if (field === 'mnemonic') payload.mnemonic = manualText
        else payload.content = manualText
      }
      
      const res = await axios.post(`/api/v1/deck/${deckId}/ask-ai`, payload)
      
      if (res.data.error) {
        alert(res.data.error)
        setIsAskingAI(false)
        return
      }
      
      if (res.data.status === 'processing') {
        let attempts = 0
        const maxAttempts = 45
        const poll = setInterval(async () => {
          attempts++
          try {
            const quizRes = await axios.get(`/api/v1/deck/${deckId}/play-data?t=${Date.now()}`)
            const updatedQ = quizRes.data.questions?.find((q: any) => q.id === currentQuestion.id)
            if (updatedQ) {
              let updatedVal = null
              if (field === 'explanation') updatedVal = updatedQ.ai_explanation
              else if (field === 'hint') updatedVal = updatedQ.hint
              else if (field === 'mnemonic') updatedVal = updatedQ.mnemonic
              else updatedVal = updatedQ.others?.ai_responses?.[field] || updatedQ.others?.[field]

              if (updatedVal) {
                setSession((prev: any) => {
                  if (!prev?.questions) return prev
                  const newQs = [...prev.questions]
                  const targetIdx = newQs.findIndex(q => q.id === updatedQ.id)
                  if (targetIdx !== -1) {
                    if (field === 'explanation') newQs[targetIdx].ai_explanation = updatedVal
                    else if (field === 'hint') newQs[targetIdx].hint = updatedVal
                    else if (field === 'mnemonic') newQs[targetIdx].mnemonic = updatedVal
                    else {
                      if (!newQs[targetIdx].others) newQs[targetIdx].others = {}
                      if (!newQs[targetIdx].others.ai_responses) newQs[targetIdx].others.ai_responses = {}
                      newQs[targetIdx].others.ai_responses[field] = updatedVal
                      newQs[targetIdx].others[field] = updatedVal
                    }
                  }
                  return { ...prev, questions: newQs }
                })
                setIsAskingAI(false)
                clearInterval(poll)
              }
            }
          } catch (e) {
            console.error("Error polling play-data for AI explanation:", e)
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(poll)
            setIsAskingAI(false)
          }
        }, 2000)
      } else {
        const updatedVal = res.data.content || res.data.ai_explanation || res.data.hint || res.data.mnemonic
        setSession((prev: any) => {
          if (!prev?.questions) return prev
          const newQs = [...prev.questions]
          if (targetIdxValid(newQs, currentIndex)) {
            if (field === 'explanation') newQs[currentIndex].ai_explanation = updatedVal
            else if (field === 'hint') newQs[currentIndex].hint = updatedVal
            else if (field === 'mnemonic') newQs[currentIndex].mnemonic = updatedVal
            else {
              if (!newQs[currentIndex].others) newQs[currentIndex].others = {}
              if (!newQs[currentIndex].others.ai_responses) newQs[currentIndex].others.ai_responses = {}
              newQs[currentIndex].others.ai_responses[field] = updatedVal
            }
          }
          return { ...prev, questions: newQs }
        })
        if (typeof manualText === 'string') setIsEditingAI(false)
        setIsAskingAI(false)
      }
    } catch (e) {
      console.error("AI explanation generation failed:", e)
      alert("AI service is currently unavailable.")
      setIsAskingAI(false)
    }
  }

  const savePrompt = async (field: string = "explanation") => {
    if (!deckId) return
    try {
      if (field === 'explanation' || field === 'mnemonic' || field === 'hint') {
        const fieldMap: Record<string, string> = {
          explanation: 'ai_prompt',
          mnemonic: 'ai_prompt_mnemonic',
          hint: 'ai_prompt_hint'
        }
        const fieldName = fieldMap[field]
        await axios.patch(`/api/v1/deck/${deckId}`, { [fieldName]: promptInput })
        setSession((prev: any) => ({ ...prev, [fieldName]: promptInput }))
      } else {
        const newPrompts = (session?.ai_prompts || []).map((p: any) => {
          if (p.id === field) {
            return { ...p, prompt: promptInput }
          }
          return p
        })
        const settingsRes = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
        const currentSettings = settingsRes.data.creator_settings || {}
        currentSettings.ai_prompts = newPrompts
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          settings: currentSettings,
          is_creator: true
        })
        setSession((prev: any) => ({ ...prev, ai_prompts: newPrompts }))
      }
      setIsEditingPrompt(false)
      alert("Prompt saved successfully!")
    } catch (e) {
      alert("Failed to save prompt.")
    }
  }

  const clearAIExplanation = async (field: string = "explanation") => {
    if (!currentQuestion) return
    if (!window.confirm("Are you sure you want to delete this AI content?")) return
    try {
      if (field === 'explanation' || field === 'hint' || field === 'mnemonic') {
        const fieldMap: Record<string, string> = {
          explanation: 'ai_explanation',
          mnemonic: 'mnemonic',
          hint: 'hint'
        }
        const dbField = fieldMap[field]
        await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, { [dbField]: null })
        setSession((prev: any) => {
          if (!prev?.questions) return prev
          const newQs = [...prev.questions]
          const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id)
          if (targetIdx !== -1) {
            newQs[targetIdx][dbField] = null
          }
          return { ...prev, questions: newQs }
        })
      } else {
        const updatedOthers = { ...(currentQuestion.others || {}) }
        if (updatedOthers.ai_responses) {
          delete updatedOthers.ai_responses[field]
        }
        await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, { others: updatedOthers })
        setSession((prev: any) => {
          if (!prev?.questions) return prev
          const newQs = [...prev.questions]
          const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id)
          if (targetIdx !== -1) {
            newQs[targetIdx].others = updatedOthers
          }
          return { ...prev, questions: newQs }
        })
      }
    } catch (e) {
      alert("Failed to delete AI explanation.")
    }
  }

  const getInsightText = () => {
    if (!currentQuestion) return 'No detail.'
    const othersExplain = currentQuestion.others?.explain || currentQuestion.others?.explanation
    if (othersExplain) return othersExplain
    if (currentQuestion.others?.other_content && typeof currentQuestion.others.other_content === 'string') {
      return currentQuestion.others.other_content
    }
    const isFlashcard = !currentQuestion.options || currentQuestion.options.length === 0
    if (isFlashcard) {
      return 'No detail.'
    }
    return currentQuestion.explanation || 'No detail.'
  }

  const saveInsight = async () => {
    if (!currentQuestion) return
    try {
      const targetKey = currentQuestion.others?.explanation ? 'explanation' : 'explain'
      const updatedOthers = {
        ...(currentQuestion.others || {}),
        [targetKey]: insightInput
      }
      await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, { others: updatedOthers })
      setSession((prev: any) => {
        if (!prev?.questions) return prev
        const newQs = [...prev.questions]
        const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id)
        if (targetIdx !== -1) {
          newQs[targetIdx].others = updatedOthers
        }
        return { ...prev, questions: newQs }
      })
      setIsEditingInsight(false)
    } catch (e) {
      alert("Failed to save insight.")
    }
  }

  return {
    isAskingAI,
    personalNote,
    setPersonalNote,
    isEditingNote,
    setIsEditingNote,
    isEditingAI,
    setIsEditingAI,
    isEditingInsight,
    setIsEditingInsight,
    insightInput,
    setInsightInput,
    aiInput,
    setAiInput,
    isEditingPrompt,
    setIsEditingPrompt,
    promptInput,
    setPromptInput,
    fetchNote,
    saveNote,
    askAI,
    savePrompt,
    clearAIExplanation,
    getInsightText,
    saveInsight
  }
}

function targetIdxValid(arr: any[], idx: number) {
  return idx >= 0 && idx < arr.length
}
