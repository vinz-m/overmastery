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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      equipment_types: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      exercise_aliases: {
        Row: {
          alias: string
          created_at: string
          exercise_id: string
          id: string
        }
        Insert: {
          alias: string
          created_at?: string
          exercise_id: string
          id?: string
        }
        Update: {
          alias?: string
          created_at?: string
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_aliases_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_equipment: {
        Row: {
          equipment_type_id: string
          exercise_id: string
          position: number
        }
        Insert: {
          equipment_type_id: string
          exercise_id: string
          position?: number
        }
        Update: {
          equipment_type_id?: string
          exercise_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscles: {
        Row: {
          exercise_id: string
          muscle_group_id: string
          position: number
          role: Database["public"]["Enums"]["muscle_role"]
        }
        Insert: {
          exercise_id: string
          muscle_group_id: string
          position?: number
          role: Database["public"]["Enums"]["muscle_role"]
        }
        Update: {
          exercise_id?: string
          muscle_group_id?: string
          position?: number
          role?: Database["public"]["Enums"]["muscle_role"]
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscles_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          assistance_kg: number | null
          completed_at: string | null
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["set_kind"]
          planned_reps: number | null
          planned_weight_kg: number | null
          position: number
          reps: number | null
          session_exercise_id: string
          status: Database["public"]["Enums"]["set_status"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          assistance_kg?: number | null
          completed_at?: string | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["set_kind"]
          planned_reps?: number | null
          planned_weight_kg?: number | null
          position: number
          reps?: number | null
          session_exercise_id: string
          status?: Database["public"]["Enums"]["set_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          assistance_kg?: number | null
          completed_at?: string | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["set_kind"]
          planned_reps?: number | null
          planned_weight_kg?: number | null
          position?: number
          reps?: number | null
          session_exercise_id?: string
          status?: Database["public"]["Enums"]["set_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_unilateral: boolean
          movement_pattern: string | null
          name: string
          owner_user_id: string | null
          slug: string | null
          tracking_type: Database["public"]["Enums"]["exercise_tracking_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_unilateral?: boolean
          movement_pattern?: string | null
          name: string
          owner_user_id?: string | null
          slug?: string | null
          tracking_type?: Database["public"]["Enums"]["exercise_tracking_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_unilateral?: boolean
          movement_pattern?: string | null
          name?: string
          owner_user_id?: string | null
          slug?: string | null
          tracking_type?: Database["public"]["Enums"]["exercise_tracking_type"]
          updated_at?: string
        }
        Relationships: []
      }
      muscle_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          time_zone: string
          unit_system: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          time_zone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          time_zone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          created_at: string
          id: string
          label: string | null
          position: number
          training_schedule_id: string
          updated_at: string
          weekday: number
          workout_template_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          position?: number
          training_schedule_id: string
          updated_at?: string
          weekday: number
          workout_template_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          position?: number
          training_schedule_id?: string
          updated_at?: string
          weekday?: number
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_training_schedule_id_fkey"
            columns: ["training_schedule_id"]
            isOneToOne: false
            referencedRelation: "training_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          is_unilateral: boolean
          notes: string | null
          position: number
          source_template_exercise_id: string | null
          status: Database["public"]["Enums"]["session_exercise_status"]
          tracking_type: Database["public"]["Enums"]["exercise_tracking_type"]
          training_session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_unilateral?: boolean
          notes?: string | null
          position: number
          source_template_exercise_id?: string | null
          status?: Database["public"]["Enums"]["session_exercise_status"]
          tracking_type: Database["public"]["Enums"]["exercise_tracking_type"]
          training_session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_unilateral?: boolean
          notes?: string | null
          position?: number
          source_template_exercise_id?: string | null
          status?: Database["public"]["Enums"]["session_exercise_status"]
          tracking_type?: Database["public"]["Enums"]["exercise_tracking_type"]
          training_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_source_template_exercise_id_fkey"
            columns: ["source_template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          planned_for: string | null
          source_schedule_slot_id: string | null
          source_workout_template_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          planned_for?: string | null
          source_schedule_slot_id?: string | null
          source_workout_template_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          planned_for?: string | null
          source_schedule_slot_id?: string | null
          source_workout_template_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_source_schedule_slot_id_fkey"
            columns: ["source_schedule_slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_source_workout_template_id_fkey"
            columns: ["source_workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          default_rest_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          position: number
          target_rep_max: number | null
          target_rep_min: number | null
          target_sets: number
          updated_at: string
          workout_template_id: string
        }
        Insert: {
          created_at?: string
          default_rest_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          target_rep_max?: number | null
          target_rep_min?: number | null
          target_sets?: number
          updated_at?: string
          workout_template_id: string
        }
        Update: {
          created_at?: string
          default_rest_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          target_rep_max?: number | null
          target_rep_min?: number | null
          target_sets?: number
          updated_at?: string
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
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
      exercise_tracking_type:
        | "weight_reps"
        | "bodyweight_reps"
        | "added_weight_reps"
        | "assistance_reps"
        | "duration"
        | "weight_distance"
        | "weight_duration"
      muscle_role: "primary" | "secondary"
      session_exercise_status: "planned" | "completed" | "skipped"
      session_status: "active" | "completed" | "abandoned"
      set_kind: "working" | "warmup"
      set_status: "planned" | "completed" | "skipped"
      unit_system: "metric" | "imperial"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      exercise_tracking_type: [
        "weight_reps",
        "bodyweight_reps",
        "added_weight_reps",
        "assistance_reps",
        "duration",
        "weight_distance",
        "weight_duration",
      ],
      muscle_role: ["primary", "secondary"],
      session_exercise_status: ["planned", "completed", "skipped"],
      session_status: ["active", "completed", "abandoned"],
      set_kind: ["working", "warmup"],
      set_status: ["planned", "completed", "skipped"],
      unit_system: ["metric", "imperial"],
    },
  },
} as const
