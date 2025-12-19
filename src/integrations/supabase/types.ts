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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          camera_id: string | null
          camera_name: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          severity: Database["public"]["Enums"]["rule_severity"]
          thumbnail: string | null
          timestamp: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          severity?: Database["public"]["Enums"]["rule_severity"]
          thumbnail?: string | null
          timestamp?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: Database["public"]["Enums"]["rule_severity"]
          thumbnail?: string | null
          timestamp?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          alerts_count: number | null
          created_at: string
          detected_people: number | null
          id: string
          last_activity: string | null
          location: string
          name: string
          status: Database["public"]["Enums"]["camera_status"]
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          alerts_count?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          location: string
          name: string
          status?: Database["public"]["Enums"]["camera_status"]
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          alerts_count?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          location?: string
          name?: string
          status?: Database["public"]["Enums"]["camera_status"]
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          actions: Database["public"]["Enums"]["rule_action"][]
          cameras: string[]
          category: Database["public"]["Enums"]["rule_category"]
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          schedule: Json | null
          severity: Database["public"]["Enums"]["rule_severity"]
          updated_at: string
        }
        Insert: {
          actions?: Database["public"]["Enums"]["rule_action"][]
          cameras?: string[]
          category?: Database["public"]["Enums"]["rule_category"]
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          schedule?: Json | null
          severity?: Database["public"]["Enums"]["rule_severity"]
          updated_at?: string
        }
        Update: {
          actions?: Database["public"]["Enums"]["rule_action"][]
          cameras?: string[]
          category?: Database["public"]["Enums"]["rule_category"]
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          schedule?: Json | null
          severity?: Database["public"]["Enums"]["rule_severity"]
          updated_at?: string
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
      alert_type: "security" | "safety" | "operations" | "access" | "analytics"
      camera_status: "online" | "offline" | "alert" | "warning"
      condition_operator:
        | "greater_than"
        | "less_than"
        | "equals"
        | "not_equals"
        | "contains"
        | "between"
      condition_type:
        | "people_count"
        | "no_ppe"
        | "restricted_area"
        | "face_recognition"
        | "vehicle_detection"
        | "loitering"
        | "crowd_density"
        | "motion_detection"
        | "object_left"
        | "perimeter_breach"
      rule_action: "alert" | "notify" | "record" | "lockdown" | "dispatch"
      rule_category:
        | "security"
        | "safety"
        | "operations"
        | "access"
        | "analytics"
      rule_severity: "low" | "medium" | "high" | "critical"
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
    Enums: {
      alert_type: ["security", "safety", "operations", "access", "analytics"],
      camera_status: ["online", "offline", "alert", "warning"],
      condition_operator: [
        "greater_than",
        "less_than",
        "equals",
        "not_equals",
        "contains",
        "between",
      ],
      condition_type: [
        "people_count",
        "no_ppe",
        "restricted_area",
        "face_recognition",
        "vehicle_detection",
        "loitering",
        "crowd_density",
        "motion_detection",
        "object_left",
        "perimeter_breach",
      ],
      rule_action: ["alert", "notify", "record", "lockdown", "dispatch"],
      rule_category: [
        "security",
        "safety",
        "operations",
        "access",
        "analytics",
      ],
      rule_severity: ["low", "medium", "high", "critical"],
    },
  },
} as const
