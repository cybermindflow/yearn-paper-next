import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (uses service role key, bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export type Database = {
  public: {
    Tables: {
      parents: {
        Row: {
          id: string
          phone: string
          nickname: string | null
          password_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          phone: string
          nickname?: string | null
          password_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          nickname?: string | null
          password_hash?: string
          created_at?: string
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          name: string
          grade: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          name: string
          grade?: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          name?: string
          grade?: string
          created_at?: string
        }
      }
      papers: {
        Row: {
          id: string
          parent_id: string
          child_id: string | null
          subject: string
          topic: string | null
          unit: string | null
          question_types: string[]
          difficulty_level: number
          page_count: number
          mode: string
          status: string
          generated_at: string
          completed_at: string | null
        }
      }
      questions: {
        Row: {
          id: string
          paper_id: string
          question_number: number
          question_text: string
          question_type: string
          options: Record<string, string> | null
          correct_answer: string
          explanation: string | null
          child_answer: string | null
          is_correct: boolean | null
          answered_at: string | null
        }
      }
      scores: {
        Row: {
          id: string
          paper_id: string
          child_id: string | null
          total_questions: number
          correct_count: number
          score_percentage: number
          time_spent_seconds: number | null
          completed_at: string
        }
      }
      knowledge_chunks: {
        Row: {
          id: string
          subject: string
          year: string
          topic: string
          unit: string
          knowledge_point: string
          learning_objective: string
          level: number
          applicable_question_types: string[]
          source: string
          last_updated: string
          version: number
        }
      }
    }
  }
}
