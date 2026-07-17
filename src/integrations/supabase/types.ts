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
    PostgrestVersion: "14.5"
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
          user_id: string
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
          user_id?: string
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
          user_id?: string
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
      analysis_history: {
        Row: {
          analysis_type: string
          camera_id: string | null
          confidence: number | null
          created_at: string
          id: string
          image_url: string | null
          result: Json
          timestamp: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          result?: Json
          timestamp?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          result?: Json
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_version: string
          created_at: string
          endpoint_group: string | null
          id: string
          ip_hash: string | null
          latency_ms: number | null
          method: string
          path: string
          status: number
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          api_version?: string
          created_at?: string
          endpoint_group?: string | null
          id?: string
          ip_hash?: string | null
          latency_ms?: number | null
          method: string
          path: string
          status: number
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          api_version?: string
          created_at?: string
          endpoint_group?: string | null
          id?: string
          ip_hash?: string | null
          latency_ms?: number | null
          method?: string
          path?: string
          status?: number
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      arm_disarm_states: {
        Row: {
          armed_at: string | null
          armed_by_email: string | null
          camera_id: string | null
          created_at: string
          disarm_at: string | null
          id: string
          schedule_days: number[] | null
          schedule_end_time: string | null
          schedule_start_time: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          armed_at?: string | null
          armed_by_email?: string | null
          camera_id?: string | null
          created_at?: string
          disarm_at?: string | null
          id?: string
          schedule_days?: number[] | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          armed_at?: string | null
          armed_by_email?: string | null
          camera_id?: string | null
          created_at?: string
          disarm_at?: string | null
          id?: string
          schedule_days?: number[] | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arm_disarm_states_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      camera_detection_rules: {
        Row: {
          active_days: number[]
          active_from: string | null
          active_to: string | null
          alert_severity: Database["public"]["Enums"]["event_alert_severity"]
          alert_title_template: string
          camera_id: string
          cooldown_seconds: number
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          metadata: Json
          min_confidence: number
          min_count: number
          name: string
          organization_id: string
          target_categories: string[]
          target_labels: string[]
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          active_days?: number[]
          active_from?: string | null
          active_to?: string | null
          alert_severity?: Database["public"]["Enums"]["event_alert_severity"]
          alert_title_template?: string
          camera_id: string
          cooldown_seconds?: number
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          metadata?: Json
          min_confidence?: number
          min_count?: number
          name: string
          organization_id: string
          target_categories?: string[]
          target_labels?: string[]
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          active_days?: number[]
          active_from?: string | null
          active_to?: string | null
          alert_severity?: Database["public"]["Enums"]["event_alert_severity"]
          alert_title_template?: string
          camera_id?: string
          cooldown_seconds?: number
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          metadata?: Json
          min_confidence?: number
          min_count?: number
          name?: string
          organization_id?: string
          target_categories?: string[]
          target_labels?: string[]
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_detection_rules_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_detection_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_events: {
        Row: {
          camera_id: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          event_type: Database["public"]["Enums"]["camera_event_type"]
          id: string
          metadata: Json
          occurred_at: string
          organization_id: string
          received_at: string
          snapshot_url: string | null
          source: string
          video_url: string | null
        }
        Insert: {
          camera_id: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          event_type: Database["public"]["Enums"]["camera_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          organization_id: string
          received_at?: string
          snapshot_url?: string | null
          source?: string
          video_url?: string | null
        }
        Update: {
          camera_id?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          event_type?: Database["public"]["Enums"]["camera_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          organization_id?: string
          received_at?: string
          snapshot_url?: string | null
          source?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          status: Database["public"]["Enums"]["camera_status"]
          stream_url: string | null
          thumbnail: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          alerts_count?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          status?: Database["public"]["Enums"]["camera_status"]
          stream_url?: string | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          alerts_count?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          status?: Database["public"]["Enums"]["camera_status"]
          stream_url?: string | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      detection_reviews: {
        Row: {
          camera_id: string | null
          camera_name: string | null
          created_at: string
          id: string
          model_name: string | null
          notes: string | null
          original_confidence: number | null
          reviewed_at: string
          risk_type: string
          source_id: string
          source_table: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          camera_id?: string | null
          camera_name?: string | null
          created_at?: string
          id?: string
          model_name?: string | null
          notes?: string | null
          original_confidence?: number | null
          reviewed_at?: string
          risk_type: string
          source_id: string
          source_table: string
          updated_at?: string
          user_id?: string
          verdict: string
        }
        Update: {
          camera_id?: string | null
          camera_name?: string | null
          created_at?: string
          id?: string
          model_name?: string | null
          notes?: string | null
          original_confidence?: number | null
          reviewed_at?: string
          risk_type?: string
          source_id?: string
          source_table?: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      edge_cache: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          namespace: string
          response: Json
          size_bytes: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          namespace: string
          response: Json
          size_bytes?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          namespace?: string
          response?: Json
          size_bytes?: number
        }
        Relationships: []
      }
      event_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          camera_id: string | null
          created_at: string
          dedup_key: string | null
          description: string | null
          event_id: string | null
          id: string
          metadata: Json
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["event_alert_severity"]
          status: Database["public"]["Enums"]["event_alert_status"]
          title: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          camera_id?: string | null
          created_at?: string
          dedup_key?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["event_alert_severity"]
          status?: Database["public"]["Enums"]["event_alert_status"]
          title: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          camera_id?: string | null
          created_at?: string
          dedup_key?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["event_alert_severity"]
          status?: Database["public"]["Enums"]["event_alert_status"]
          title?: string
          triggered_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_alerts_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "camera_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_detections: {
        Row: {
          attributes: Json
          bbox: Json | null
          category: string | null
          confidence: number
          created_at: string
          event_id: string
          id: string
          label: string
          model_name: string | null
          model_version: string | null
          organization_id: string
          zone_id: string | null
        }
        Insert: {
          attributes?: Json
          bbox?: Json | null
          category?: string | null
          confidence: number
          created_at?: string
          event_id: string
          id?: string
          label: string
          model_name?: string | null
          model_version?: string | null
          organization_id: string
          zone_id?: string | null
        }
        Update: {
          attributes?: Json
          bbox?: Json | null
          category?: string | null
          confidence?: number
          created_at?: string
          event_id?: string
          id?: string
          label?: string
          model_name?: string | null
          model_version?: string | null
          organization_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_detections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "camera_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_detections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          alert_id: string | null
          corrected_label: string | null
          created_at: string
          event_id: string | null
          id: string
          notes: string | null
          organization_id: string
          original_confidence: number | null
          reviewed_at: string
          reviewer_id: string
          updated_at: string
          verdict: Database["public"]["Enums"]["event_review_verdict"]
        }
        Insert: {
          alert_id?: string | null
          corrected_label?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          original_confidence?: number | null
          reviewed_at?: string
          reviewer_id: string
          updated_at?: string
          verdict: Database["public"]["Enums"]["event_review_verdict"]
        }
        Update: {
          alert_id?: string | null
          corrected_label?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          original_confidence?: number | null
          reviewed_at?: string
          reviewer_id?: string
          updated_at?: string
          verdict?: Database["public"]["Enums"]["event_review_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "event_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "camera_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      face_embeddings: {
        Row: {
          created_at: string
          embedding: number[]
          embedding_dim: number
          id: string
          model_version: string
          person_id: string
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          quality_score: number | null
          source_hash: string | null
          source_photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding: number[]
          embedding_dim?: number
          id?: string
          model_version?: string
          person_id: string
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          quality_score?: number | null
          source_hash?: string | null
          source_photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: number[]
          embedding_dim?: number
          id?: string
          model_version?: string
          person_id?: string
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          quality_score?: number | null
          source_hash?: string | null
          source_photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_embeddings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "registered_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      face_recognition_configs: {
        Row: {
          alert_cooldown: number
          alert_on_unknown: boolean
          arcface_threshold: number
          camera_id: string | null
          created_at: string
          detect_multiple_faces: boolean
          enabled: boolean
          id: string
          liveness_required: boolean
          liveness_threshold: number
          match_threshold: number
          max_faces_per_frame: number
          min_face_quality: number
          min_face_size: number
          provider: string
          save_unknown_faces: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_cooldown?: number
          alert_on_unknown?: boolean
          arcface_threshold?: number
          camera_id?: string | null
          created_at?: string
          detect_multiple_faces?: boolean
          enabled?: boolean
          id?: string
          liveness_required?: boolean
          liveness_threshold?: number
          match_threshold?: number
          max_faces_per_frame?: number
          min_face_quality?: number
          min_face_size?: number
          provider?: string
          save_unknown_faces?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_cooldown?: number
          alert_on_unknown?: boolean
          arcface_threshold?: number
          camera_id?: string | null
          created_at?: string
          detect_multiple_faces?: boolean
          enabled?: boolean
          id?: string
          liveness_required?: boolean
          liveness_threshold?: number
          match_threshold?: number
          max_faces_per_frame?: number
          min_face_quality?: number
          min_face_size?: number
          provider?: string
          save_unknown_faces?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_recognition_configs_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      heatmap_snapshots: {
        Row: {
          avg_intensity: number
          camera_id: string | null
          created_at: string
          data_points: number
          id: string
          image_url: string | null
          max_intensity: number
          metadata: Json | null
          min_intensity: number
          period_end: string | null
          period_start: string | null
          resolution: Json | null
          user_id: string
        }
        Insert: {
          avg_intensity?: number
          camera_id?: string | null
          created_at?: string
          data_points?: number
          id?: string
          image_url?: string | null
          max_intensity?: number
          metadata?: Json | null
          min_intensity?: number
          period_end?: string | null
          period_start?: string | null
          resolution?: Json | null
          user_id: string
        }
        Update: {
          avg_intensity?: number
          camera_id?: string | null
          created_at?: string
          data_points?: number
          id?: string
          image_url?: string | null
          max_intensity?: number
          metadata?: Json | null
          min_intensity?: number
          period_end?: string | null
          period_start?: string | null
          resolution?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_snapshots_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          key: string
          response: Json
        }
        Insert: {
          created_at?: string
          key: string
          response: Json
        }
        Update: {
          created_at?: string
          key?: string
          response?: Json
        }
        Relationships: []
      }
      model_thresholds: {
        Row: {
          created_at: string
          id: string
          min_confidence: number
          min_quality: number | null
          model_name: string
          notes: string | null
          risk_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_confidence?: number
          min_quality?: number | null
          model_name?: string
          notes?: string | null
          risk_type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_confidence?: number
          min_quality?: number | null
          model_name?: string
          notes?: string | null
          risk_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_configs: {
        Row: {
          channels: string[]
          cooldown_minutes: number
          created_at: string
          email_recipients: string[]
          enabled: boolean
          id: string
          name: string
          phone_recipients: string[]
          schedule_days: number[] | null
          schedule_enabled: boolean
          schedule_end_time: string | null
          schedule_start_time: string | null
          severity_filter: string[]
          updated_at: string
          user_id: string
          webhook_urls: string[]
        }
        Insert: {
          channels?: string[]
          cooldown_minutes?: number
          created_at?: string
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          name?: string
          phone_recipients?: string[]
          schedule_days?: number[] | null
          schedule_enabled?: boolean
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          severity_filter?: string[]
          updated_at?: string
          user_id: string
          webhook_urls?: string[]
        }
        Update: {
          channels?: string[]
          cooldown_minutes?: number
          created_at?: string
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          name?: string
          phone_recipients?: string[]
          schedule_days?: number[] | null
          schedule_enabled?: boolean
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          severity_filter?: string[]
          updated_at?: string
          user_id?: string
          webhook_urls?: string[]
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      panic_events: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      plate_detections: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plate_detections_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      plate_detections_m2026_05: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_06: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_07: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_08: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_09: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_10: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_11: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2026_12: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_m2027_01: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      plate_detections_y2025_y2026_pre: {
        Row: {
          camera_id: string | null
          camera_name: string
          confidence: number
          created_at: string
          direction: string | null
          id: string
          image_url: string | null
          plate: string
          status: string
          timestamp: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          camera_id?: string | null
          camera_name: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate: string
          status?: string
          timestamp?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          confidence?: number
          created_at?: string
          direction?: string | null
          id?: string
          image_url?: string | null
          plate?: string
          status?: string
          timestamp?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          metadata: Json | null
          operation: string
          query_limit: number | null
          query_offset: number | null
          query_type: string | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          query_type?: string | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          query_type?: string | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recognition_logs: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_logs_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "registered_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_logs_m2026_05: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_06: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_07: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_08: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_09: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_10: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_11: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2026_12: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_m2027_01: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recognition_logs_y2025_y2026_pre: {
        Row: {
          age_estimated: number | null
          camera_id: string | null
          confidence: number | null
          created_at: string
          gender_estimated: string | null
          id: string
          image_url: string | null
          liveness_score: number | null
          model_version: string | null
          person_id: string | null
          pose_pitch: number | null
          pose_roll: number | null
          pose_yaw: number | null
          recognized: boolean
          spoof_detected: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          age_estimated?: number | null
          camera_id?: string | null
          confidence?: number | null
          created_at?: string
          gender_estimated?: string | null
          id?: string
          image_url?: string | null
          liveness_score?: number | null
          model_version?: string | null
          person_id?: string | null
          pose_pitch?: number | null
          pose_roll?: number | null
          pose_yaw?: number | null
          recognized?: boolean
          spoof_detected?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      recording_configs: {
        Row: {
          camera_id: string | null
          created_at: string
          enabled: boolean
          format: string
          id: string
          max_duration_seconds: number
          max_file_size_mb: number
          post_buffer_seconds: number
          pre_buffer_seconds: number
          quality: string
          record_on_alert: boolean
          record_on_motion: boolean
          retention_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          enabled?: boolean
          format?: string
          id?: string
          max_duration_seconds?: number
          max_file_size_mb?: number
          post_buffer_seconds?: number
          pre_buffer_seconds?: number
          quality?: string
          record_on_alert?: boolean
          record_on_motion?: boolean
          retention_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          enabled?: boolean
          format?: string
          id?: string
          max_duration_seconds?: number
          max_file_size_mb?: number
          post_buffer_seconds?: number
          pre_buffer_seconds?: number
          quality?: string
          record_on_alert?: boolean
          record_on_motion?: boolean
          retention_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_configs_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_persons: {
        Row: {
          created_at: string
          department: string | null
          encoding_migrated_at: string | null
          encoding_version: string
          face_encoding: Json | null
          id: string
          is_active: boolean
          list_type: string | null
          name: string
          notes: string | null
          photo_url: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          encoding_migrated_at?: string | null
          encoding_version?: string
          face_encoding?: Json | null
          id?: string
          is_active?: boolean
          list_type?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          encoding_migrated_at?: string | null
          encoding_version?: string
          face_encoding?: Json | null
          id?: string
          is_active?: boolean
          list_type?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registered_plates: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          list_type: string
          notes: string | null
          owner_name: string | null
          plate: string
          updated_at: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          list_type?: string
          notes?: string | null
          owner_name?: string | null
          plate: string
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          list_type?: string
          notes?: string | null
          owner_name?: string | null
          plate?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      rule_executions: {
        Row: {
          actions_executed: string[]
          alert_id: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          rule_id: string | null
          status: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          actions_executed?: string[]
          alert_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          status?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          actions_executed?: string[]
          alert_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          rule_id?: string | null
          status?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_executions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string
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
          user_id?: string
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
          user_id?: string
        }
        Relationships: []
      }
      stream_recordings: {
        Row: {
          camera_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          format: string | null
          id: string
          quality: string | null
          started_at: string
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          quality?: string | null
          started_at?: string
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          quality?: string | null
          started_at?: string
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_recordings_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_preferences: {
        Row: {
          created_at: string
          filters: Json
          id: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          model: string | null
          notes: string | null
          owner: string | null
          plate: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          model?: string | null
          notes?: string | null
          owner?: string | null
          plate: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          model?: string | null
          notes?: string | null
          owner?: string | null
          plate?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_clips: {
        Row: {
          camera_id: string | null
          created_at: string
          duration: number | null
          end_time: string | null
          file_url: string | null
          id: string
          start_time: string
          status: string
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          file_url?: string | null
          id?: string
          start_time: string
          status?: string
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          file_url?: string | null
          id?: string
          start_time?: string
          status?: string
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_clips_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_events: {
        Row: {
          created_at: string
          detected_objects: Json | null
          event_type: string
          id: string
          timestamp: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          detected_objects?: Json | null
          event_type: string
          id?: string
          timestamp?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          detected_objects?: Json | null
          event_type?: string
          id?: string
          timestamp?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zone_events_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          camera_id: string | null
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          points: Json
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          points?: Json
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      array_days_valid: { Args: { days: number[] }; Returns: boolean }
      cleanup_api_usage_logs: { Args: never; Returns: number }
      cleanup_edge_cache: { Args: never; Returns: number }
      delete_user_data: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      ensure_future_partitions: {
        Args: { months_ahead?: number }
        Returns: Json
      }
      get_api_usage_stats: { Args: { _days?: number }; Returns: Json }
      get_operational_metrics: { Args: never; Returns: Json }
      get_slow_queries: {
        Args: { _limit?: number }
        Returns: {
          calls: number
          max_ms: number
          mean_ms: number
          query: string
          rows_returned: number
          total_ms: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_org_role: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["org_role"][]
          _user: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_settings_backup: {
        Args: { _payload: Json; _strategy?: string }
        Returns: Json
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      replace_user_role: {
        Args: {
          _admin_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      run_index_maintenance: { Args: never; Returns: Json }
      run_retention_cleanup: { Args: never; Returns: Json }
      system_health: { Args: never; Returns: Json }
    }
    Enums: {
      alert_type:
        | "security"
        | "safety"
        | "operations"
        | "access"
        | "analytics"
        | "absence"
        | "agglomeration"
        | "anomaly"
        | "panic"
        | "arm_disarm"
        | "scene_change"
        | "camera_offline"
        | "recurrent_vehicle"
        | "qr_code_event"
      app_role: "admin" | "manager" | "operator" | "viewer"
      camera_event_type:
        | "motion"
        | "person_detected"
        | "vehicle_detected"
        | "face_detected"
        | "plate_detected"
        | "zone_entry"
        | "zone_exit"
        | "loitering"
        | "tampering"
        | "offline"
        | "online"
        | "ppe_violation"
        | "behavior_anomaly"
        | "panic"
        | "manual"
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
        | "absence_detection"
        | "agglomeration_detection"
        | "anomaly_position"
        | "anomaly_speed"
        | "anomaly_displacement"
        | "scene_change"
        | "recurrent_vehicle"
      event_alert_severity: "low" | "medium" | "high" | "critical"
      event_alert_status: "open" | "acknowledged" | "resolved" | "dismissed"
      event_review_verdict:
        | "true_positive"
        | "false_positive"
        | "false_negative"
        | "uncertain"
      org_role: "owner" | "admin" | "member" | "viewer"
      rule_action:
        | "alert"
        | "notify"
        | "record"
        | "lockdown"
        | "dispatch"
        | "arm"
        | "disarm"
        | "panic"
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
      alert_type: [
        "security",
        "safety",
        "operations",
        "access",
        "analytics",
        "absence",
        "agglomeration",
        "anomaly",
        "panic",
        "arm_disarm",
        "scene_change",
        "camera_offline",
        "recurrent_vehicle",
        "qr_code_event",
      ],
      app_role: ["admin", "manager", "operator", "viewer"],
      camera_event_type: [
        "motion",
        "person_detected",
        "vehicle_detected",
        "face_detected",
        "plate_detected",
        "zone_entry",
        "zone_exit",
        "loitering",
        "tampering",
        "offline",
        "online",
        "ppe_violation",
        "behavior_anomaly",
        "panic",
        "manual",
      ],
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
        "absence_detection",
        "agglomeration_detection",
        "anomaly_position",
        "anomaly_speed",
        "anomaly_displacement",
        "scene_change",
        "recurrent_vehicle",
      ],
      event_alert_severity: ["low", "medium", "high", "critical"],
      event_alert_status: ["open", "acknowledged", "resolved", "dismissed"],
      event_review_verdict: [
        "true_positive",
        "false_positive",
        "false_negative",
        "uncertain",
      ],
      org_role: ["owner", "admin", "member", "viewer"],
      rule_action: [
        "alert",
        "notify",
        "record",
        "lockdown",
        "dispatch",
        "arm",
        "disarm",
        "panic",
      ],
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
