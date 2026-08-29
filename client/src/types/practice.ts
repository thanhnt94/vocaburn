import type { Question, Option } from './flashcard'

export type PracticeSubMode = 'mcq' | 'typing' | 'listening' | 'roadmap_test' | 'roadmap_mcq' | 'roadmap_typing' | string

export interface PracticePair {
  q: string
  a: string | string[]
  name?: string
  prompt_col?: string
  answer_col?: string | string[]
}

export interface PracticeQuestionData {
  question: string
  choices?: string[]
  choices_data?: any[]
  choice_item_ids?: number[]
  correct_index?: number
  correct_answer?: string
  acceptable_answers?: string[]
  question_key?: string
  answer_key?: string | string[]
  answer_keys?: string[]
  [key: string]: any
}

export interface PracticeSessionData {
  id?: number | string
  title?: string
  questions?: Question[]
  practice_settings?: any
  creator_settings?: any
  deck_type?: string
  is_roadmap?: boolean
  roadmap_step?: any
  [key: string]: any
}

export interface PracticeAnswerContext {
  wasCorrect: boolean
  prevTotal: number
  prevCorrect: number
  timeTaken: number
  avgTime: number
  newStreak: number
  xpGained: number
}

export interface RoadmapTestResult {
  passed: boolean
  score: number
  total: number
  percent: number
  pass_threshold?: number
  time_spent?: number
  xp_gained?: number
}
