export interface Option {
  id: number
  content: string
  is_correct: boolean
}

export interface Question {
  id: number
  original_index?: number
  is_ignored?: boolean
  is_starred?: boolean
  content: string
  explanation: string
  ai_explanation?: string
  hint?: string | null
  mnemonic?: string | null
  options: Option[]
  stats?: { 
    total: number
    correct: number
    wrong?: number
    avg_time: number
    again_count?: number
    hard_count?: number
    good_count?: number
    easy_count?: number
  }
  box_level?: number
  image?: string | null
  audio?: string | null
  front_img?: string | null
  back_img?: string | null
  front_audio_url?: string | null
  back_audio_url?: string | null
  front_audio_content?: string | null
  back_audio_content?: string | null
  others?: Record<string, any> | null
  fsrs?: {
    state: number
    stability: number | null
    difficulty: number | null
    due: string | null
    last_review: string | null
    first_learned?: string | null
    last_reviewed?: string | null
    intervals: Record<number, string>
  }
  practice?: {
    question: string
    choices?: string[]
    correct_index?: number
    correct_answer?: string
    question_key: string
    answer_key: string
  }
}

export type LearningMode = 'fsrs' | 'new' | 'review' | 'flip' | 'roadmap'
export type CardBoxId = 'unseen' | 'learning' | 'mastered' | 'hard' | 'starred' | 'ignored'
export type FilterMapMode = 'all' | CardBoxId
