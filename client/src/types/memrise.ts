export type MemriseSessionType = 'plant' | 'water';

export interface MemriseCardPayload {
  card_id: number;
  stage?: number;
  watering_level?: number;
  test_type?: 'mcq' | 'typing' | 'audio';
  front: string;
  back: string;
  others: Record<string, any>;
  is_bloomed?: boolean;
  mcq_data?: any;
  mcq_rev_data?: any;
  audio_data?: any;
  listening_data?: any;
  typing_data?: any;
}

export interface MemriseSessionResponse {
  session_id: number;
  cards: MemriseCardPayload[];
  practice_settings?: any;
  message?: string;
}

export interface MemriseStats {
  bloomed: number;
  planting: number;
  wilting: number;
}
