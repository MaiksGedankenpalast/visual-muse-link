export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      challenge_responses: {
        Row: {
          challenge_id: string
          created_at: string
          date: string
          id: string
          response_text_1: string | null
          response_text_2: string | null
          response_text_3: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          date?: string
          id?: string
          response_text_1?: string | null
          response_text_2?: string | null
          response_text_3?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          date?: string
          id?: string
          response_text_1?: string | null
          response_text_2?: string | null
          response_text_3?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          category: string | null
          created_at: string
          default_target: number | null
          description: string | null
          icon: string | null
          id: string
          is_preset: boolean
          is_quantifiable: boolean
          title: string
          unit: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_target?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_preset?: boolean
          is_quantifiable?: boolean
          title: string
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          default_target?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_preset?: boolean
          is_quantifiable?: boolean
          title?: string
          unit?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_completions: {
        Row: {
          challenge_id: string
          completed: boolean
          created_at: string
          date: string
          id: string
          logged_value: number | null
          notes: string | null
          response_data: Json | null
          status: string
          target_value: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          logged_value?: number | null
          notes?: string | null
          response_data?: Json | null
          status?: string
          target_value?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          logged_value?: number | null
          notes?: string | null
          response_data?: Json | null
          status?: string
          target_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          category: string
          content: string | null
          created_at: string
          date: string
          id: string
          mood_snapshot: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          mood_snapshot?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          mood_snapshot?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          caption: string | null
          created_at: string
          date: string
          id: string
          photo_url: string
          prompt_used: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          date?: string
          id?: string
          photo_url: string
          prompt_used?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          date?: string
          id?: string
          photo_url?: string
          prompt_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          calm_anxious: number
          confident_insecure: number
          created_at: string
          date: string
          excited_bored: number
          happy_sad: number
          id: string
          rested_tired: number
          tags: string[] | null
          user_id: string
        }
        Insert: {
          calm_anxious?: number
          confident_insecure?: number
          created_at?: string
          date: string
          excited_bored?: number
          happy_sad?: number
          id?: string
          rested_tired?: number
          tags?: string[] | null
          user_id: string
        }
        Update: {
          calm_anxious?: number
          confident_insecure?: number
          created_at?: string
          date?: string
          excited_bored?: number
          happy_sad?: number
          id?: string
          rested_tired?: number
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          onboarding_complete: boolean
          onboarding_goals: string[] | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          onboarding_complete?: boolean
          onboarding_goals?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          onboarding_complete?: boolean
          onboarding_goals?: string[] | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          llm_narrative: string | null
          period_end: string
          period_start: string
          stats_snapshot: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          llm_narrative?: string | null
          period_end: string
          period_start: string
          stats_snapshot?: Json | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          llm_narrative?: string | null
          period_end?: string
          period_start?: string
          stats_snapshot?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_logs: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          triggered_rule: string
          user_id: string
          user_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          triggered_rule: string
          user_id: string
          user_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          triggered_rule?: string
          user_id?: string
          user_message?: string | null
        }
        Relationships: []
      }
      smart_challenges: {
        Row: {
          challenge_text: string
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          id: string
          prompt_context: string | null
          rationale: string | null
          user_id: string
        }
        Insert: {
          challenge_text: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          prompt_context?: string | null
          rationale?: string | null
          user_id: string
        }
        Update: {
          challenge_text?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          prompt_context?: string | null
          rationale?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tree_progress: {
        Row: {
          created_at: string
          current_phase: number
          id: string
          last_chat_award_at: string | null
          last_update: string
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: number
          id?: string
          last_chat_award_at?: string | null
          last_update?: string
          points?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: number
          id?: string
          last_chat_award_at?: string | null
          last_update?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      user_app_start: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_seen_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          added_at: string
          challenge_id: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          added_at?: string
          challenge_id: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          added_at?: string
          challenge_id?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_items: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          is_suggestion: boolean
          text: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          is_suggestion?: boolean
          text: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          is_suggestion?: boolean
          text?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
