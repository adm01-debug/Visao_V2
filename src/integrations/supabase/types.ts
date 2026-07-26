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
      agent_discoveries: {
        Row: {
          agent_id: string
          created_at: string
          discovered_at: string
          firmware: string | null
          host: string
          id: string
          manufacturer: string | null
          model: string | null
          onvif_endpoint: string | null
          port: number
          ptz_capable: boolean
          raw: Json | null
          rtsp_primary: string | null
          rtsp_substream: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          discovered_at?: string
          firmware?: string | null
          host: string
          id?: string
          manufacturer?: string | null
          model?: string | null
          onvif_endpoint?: string | null
          port: number
          ptz_capable?: boolean
          raw?: Json | null
          rtsp_primary?: string | null
          rtsp_substream?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          discovered_at?: string
          firmware?: string | null
          host?: string
          id?: string
          manufacturer?: string | null
          model?: string | null
          onvif_endpoint?: string | null
          port?: number
          ptz_capable?: boolean
          raw?: Json | null
          rtsp_primary?: string | null
          rtsp_substream?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_discoveries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_discoveries_purge_runs: {
        Row: {
          created_at: string
          deleted_count: number
          duration_ms: number
          executed_at: string
          id: string
          retention_days: number
        }
        Insert: {
          created_at?: string
          deleted_count?: number
          duration_ms?: number
          executed_at?: string
          id?: string
          retention_days: number
        }
        Update: {
          created_at?: string
          deleted_count?: number
          duration_ms?: number
          executed_at?: string
          id?: string
          retention_days?: number
        }
        Relationships: []
      }
      agent_healing_actions: {
        Row: {
          action: string
          admission_rank: number | null
          agent_id: string
          attempts: number
          created_at: string
          deaf_ratio: number | null
          id: string
          jitter_seconds: number
          reason: string
          run_id: string | null
          severity: string
          silent_minutes: number | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          admission_rank?: number | null
          agent_id: string
          attempts?: number
          created_at?: string
          deaf_ratio?: number | null
          id?: string
          jitter_seconds?: number
          reason: string
          run_id?: string | null
          severity: string
          silent_minutes?: number | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admission_rank?: number | null
          agent_id?: string
          attempts?: number
          created_at?: string
          deaf_ratio?: number | null
          id?: string
          jitter_seconds?: number
          reason?: string
          run_id?: string | null
          severity?: string
          silent_minutes?: number | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_healing_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_healing_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_healing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_healing_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_relay_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_healing_runs: {
        Row: {
          actions_enqueued: number
          agents_critical: number
          agents_escalated: number
          agents_observed: number
          agents_total: number
          agents_warning: number
          breaker_reason: string | null
          breaker_tripped: boolean
          created_at: string
          duration_ms: number
          effective_budget: number
          error_detail: string | null
          id: string
          ok: boolean
          ran_at: string
          restarts_admitted: number
          restarts_deferred: number
          restarts_requested: number
          restarts_suppressed: number
        }
        Insert: {
          actions_enqueued?: number
          agents_critical?: number
          agents_escalated?: number
          agents_observed?: number
          agents_total?: number
          agents_warning?: number
          breaker_reason?: string | null
          breaker_tripped?: boolean
          created_at?: string
          duration_ms?: number
          effective_budget?: number
          error_detail?: string | null
          id?: string
          ok?: boolean
          ran_at?: string
          restarts_admitted?: number
          restarts_deferred?: number
          restarts_requested?: number
          restarts_suppressed?: number
        }
        Update: {
          actions_enqueued?: number
          agents_critical?: number
          agents_escalated?: number
          agents_observed?: number
          agents_total?: number
          agents_warning?: number
          breaker_reason?: string | null
          breaker_tripped?: boolean
          created_at?: string
          duration_ms?: number
          effective_budget?: number
          error_detail?: string | null
          id?: string
          ok?: boolean
          ran_at?: string
          restarts_admitted?: number
          restarts_deferred?: number
          restarts_requested?: number
          restarts_suppressed?: number
        }
        Relationships: []
      }
      agent_relay_purge_runs: {
        Row: {
          created_at: string
          deleted_count: number
          duration_ms: number
          executed_at: string
          expired_count: number
          id: string
          retention_days: number
        }
        Insert: {
          created_at?: string
          deleted_count?: number
          duration_ms?: number
          executed_at?: string
          expired_count?: number
          id?: string
          retention_days: number
        }
        Update: {
          created_at?: string
          deleted_count?: number
          duration_ms?: number
          executed_at?: string
          expired_count?: number
          id?: string
          retention_days?: number
        }
        Relationships: []
      }
      agent_relay_tasks: {
        Row: {
          agent_id: string
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          expires_at: string
          id: string
          kind: string
          last_error: string | null
          lease_expires_at: string | null
          request: Json
          response: Json | null
          scheduled_at: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string
          id?: string
          kind: string
          last_error?: string | null
          lease_expires_at?: string | null
          request: Json
          response?: Json | null
          scheduled_at?: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          lease_expires_at?: string | null
          request?: Json
          response?: Json | null
          scheduled_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_relay_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      alertmanager_silences_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string
          comment: string | null
          created_at: string
          duration_minutes: number | null
          error_message: string | null
          id: string
          ip_address: string | null
          justification: string | null
          matchers: Json | null
          request_id: string | null
          silence_id: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id: string
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          justification?: string | null
          matchers?: Json | null
          request_id?: string | null
          silence_id?: string | null
          status: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          justification?: string | null
          matchers?: Json | null
          request_id?: string | null
          silence_id?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          camera_id: string | null
          camera_name: string
          created_at: string
          id: string
          is_read: boolean
          is_test: boolean
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
          is_test?: boolean
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
          is_test?: boolean
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
      camera_bandwidth_samples: {
        Row: {
          bitrate_kbps: number
          bytes_received: number
          camera_id: string
          created_at: string
          fps: number | null
          id: string
          resolution: string | null
          sampled_at: string
          stream_type: string
          user_id: string
          window_seconds: number
        }
        Insert: {
          bitrate_kbps?: number
          bytes_received?: number
          camera_id: string
          created_at?: string
          fps?: number | null
          id?: string
          resolution?: string | null
          sampled_at?: string
          stream_type?: string
          user_id: string
          window_seconds?: number
        }
        Update: {
          bitrate_kbps?: number
          bytes_received?: number
          camera_id?: string
          created_at?: string
          fps?: number | null
          id?: string
          resolution?: string | null
          sampled_at?: string
          stream_type?: string
          user_id?: string
          window_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "camera_bandwidth_samples_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_clock_skew_findings: {
        Row: {
          camera_id: string | null
          created_at: string
          detected_at: string
          direction: string
          id: string
          max_abs_skew_seconds: number
          median_skew_seconds: number
          reason: string
          run_id: string
          sample_count: number
          sentinel_rows: number
          severity: string
          source_table: string
          suppressed: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          detected_at?: string
          direction?: string
          id?: string
          max_abs_skew_seconds?: number
          median_skew_seconds?: number
          reason?: string
          run_id: string
          sample_count?: number
          sentinel_rows?: number
          severity: string
          source_table: string
          suppressed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          detected_at?: string
          direction?: string
          id?: string
          max_abs_skew_seconds?: number
          median_skew_seconds?: number
          reason?: string
          run_id?: string
          sample_count?: number
          sentinel_rows?: number
          severity?: string
          source_table?: string
          suppressed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_clock_skew_findings_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_clock_skew_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "camera_clock_skew_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_clock_skew_runs: {
        Row: {
          cameras_analyzed: number
          cameras_critical: number
          cameras_warning: number
          created_at: string
          critical_seconds: number
          duration_ms: number
          error_detail: string | null
          id: string
          lookback_hours: number
          min_samples: number
          ok: boolean
          ran_at: string
          sources: string[]
          updated_at: string
          warn_seconds: number
        }
        Insert: {
          cameras_analyzed?: number
          cameras_critical?: number
          cameras_warning?: number
          created_at?: string
          critical_seconds?: number
          duration_ms?: number
          error_detail?: string | null
          id?: string
          lookback_hours?: number
          min_samples?: number
          ok?: boolean
          ran_at?: string
          sources?: string[]
          updated_at?: string
          warn_seconds?: number
        }
        Update: {
          cameras_analyzed?: number
          cameras_critical?: number
          cameras_warning?: number
          created_at?: string
          critical_seconds?: number
          duration_ms?: number
          error_detail?: string | null
          id?: string
          lookback_hours?: number
          min_samples?: number
          ok?: boolean
          ran_at?: string
          sources?: string[]
          updated_at?: string
          warn_seconds?: number
        }
        Relationships: []
      }
      camera_connectivity_preferences: {
        Row: {
          camera_id: string
          created_at: string
          last_success_at: string | null
          metadata: Json
          preferred_path: string
          public_host: string | null
          public_port: number | null
          relay_agent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          last_success_at?: string | null
          metadata?: Json
          preferred_path: string
          public_host?: string | null
          public_port?: number | null
          relay_agent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          last_success_at?: string | null
          metadata?: Json
          preferred_path?: string
          public_host?: string | null
          public_port?: number | null
          relay_agent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_connectivity_preferences_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_connectivity_preferences_relay_agent_id_fkey"
            columns: ["relay_agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_credentials: {
        Row: {
          camera_id: string
          created_at: string
          dek_wrapped: string | null
          encrypted_password: string | null
          id: string
          kek_version: number | null
          key_fingerprint: string
          sanitized_url: string
          updated_at: string
          user_id: string
          username: string | null
          wrapped_at: string | null
        }
        Insert: {
          camera_id: string
          created_at?: string
          dek_wrapped?: string | null
          encrypted_password?: string | null
          id?: string
          kek_version?: number | null
          key_fingerprint: string
          sanitized_url: string
          updated_at?: string
          user_id: string
          username?: string | null
          wrapped_at?: string | null
        }
        Update: {
          camera_id?: string
          created_at?: string
          dek_wrapped?: string | null
          encrypted_password?: string | null
          id?: string
          kek_version?: number | null
          key_fingerprint?: string
          sanitized_url?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          wrapped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_credentials_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
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
      camera_health_state: {
        Row: {
          camera_id: string
          consecutive_critical_scores: number
          consecutive_failures: number
          consecutive_successes: number
          created_at: string
          last_alert_at: string | null
          last_check_at: string | null
          last_critical_alert_at: string | null
          last_http_code: number | null
          last_latency_ms: number | null
          last_message: string | null
          last_state_change_at: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          consecutive_critical_scores?: number
          consecutive_failures?: number
          consecutive_successes?: number
          created_at?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          last_critical_alert_at?: string | null
          last_http_code?: number | null
          last_latency_ms?: number | null
          last_message?: string | null
          last_state_change_at?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          consecutive_critical_scores?: number
          consecutive_failures?: number
          consecutive_successes?: number
          created_at?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          last_critical_alert_at?: string | null
          last_http_code?: number | null
          last_latency_ms?: number | null
          last_message?: string | null
          last_state_change_at?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_health_state_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_patrol_stops: {
        Row: {
          created_at: string
          dwell_seconds: number
          id: string
          patrol_id: string
          preset_id: string
          stop_order: number
        }
        Insert: {
          created_at?: string
          dwell_seconds?: number
          id?: string
          patrol_id: string
          preset_id: string
          stop_order: number
        }
        Update: {
          created_at?: string
          dwell_seconds?: number
          id?: string
          patrol_id?: string
          preset_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "camera_patrol_stops_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "camera_patrols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_patrol_stops_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "camera_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_patrols: {
        Row: {
          camera_id: string
          created_at: string
          current_stop_index: number | null
          id: string
          is_active: boolean
          loop_enabled: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          current_stop_index?: number | null
          id?: string
          is_active?: boolean
          loop_enabled?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          current_stop_index?: number | null
          id?: string
          is_active?: boolean
          loop_enabled?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_patrols_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_presets: {
        Row: {
          camera_id: string
          created_at: string
          id: string
          is_home: boolean
          name: string
          preset_number: number
          ptz_position: Json
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          uses: number
        }
        Insert: {
          camera_id: string
          created_at?: string
          id?: string
          is_home?: boolean
          name: string
          preset_number: number
          ptz_position?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          uses?: number
        }
        Update: {
          camera_id?: string
          created_at?: string
          id?: string
          is_home?: boolean
          name?: string
          preset_number?: number
          ptz_position?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "camera_presets_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_ptz_config: {
        Row: {
          calibration: Json
          camera_id: string
          capabilities: Json
          channel: number
          created_at: string
          default_speed: number
          endpoint: string
          id: string
          limits: Json
          limits_history: Json
          limits_version: string | null
          password_encrypted: string | null
          port: number
          protocol: string
          ptz_backends: string[]
          ptz_backends_mode: string
          setup_completed_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          calibration?: Json
          camera_id: string
          capabilities?: Json
          channel?: number
          created_at?: string
          default_speed?: number
          endpoint: string
          id?: string
          limits?: Json
          limits_history?: Json
          limits_version?: string | null
          password_encrypted?: string | null
          port?: number
          protocol: string
          ptz_backends?: string[]
          ptz_backends_mode?: string
          setup_completed_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          calibration?: Json
          camera_id?: string
          capabilities?: Json
          channel?: number
          created_at?: string
          default_speed?: number
          endpoint?: string
          id?: string
          limits?: Json
          limits_history?: Json
          limits_version?: string | null
          password_encrypted?: string | null
          port?: number
          protocol?: string
          ptz_backends?: string[]
          ptz_backends_mode?: string
          setup_completed_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_ptz_config_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_ptz_locks: {
        Row: {
          acquired_at: string
          camera_id: string
          expires_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          camera_id: string
          expires_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          camera_id?: string
          expires_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_ptz_locks_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_schedule_runs: {
        Row: {
          affected_cameras: number
          error: string | null
          id: string
          ran_at: string
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          affected_cameras?: number
          error?: string | null
          id?: string
          ran_at?: string
          schedule_id: string
          status: string
          user_id: string
        }
        Update: {
          affected_cameras?: number
          error?: string | null
          id?: string
          ran_at?: string
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "camera_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_schedules: {
        Row: {
          action: string
          camera_id: string | null
          created_at: string
          cron_expression: string
          enabled: boolean
          group_id: string | null
          id: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          name: string
          scope: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          camera_id?: string | null
          created_at?: string
          cron_expression: string
          enabled?: boolean
          group_id?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name: string
          scope: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          camera_id?: string | null
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          group_id?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          scope?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_schedules_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitor_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_vault_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          affected_rows: number | null
          camera_id: string | null
          created_at: string
          error_code: string | null
          id: string
          ip: string | null
          kek_version_from: number | null
          kek_version_to: number | null
          metadata: Json
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          affected_rows?: number | null
          camera_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          ip?: string | null
          kek_version_from?: number | null
          kek_version_to?: number | null
          metadata?: Json
          success: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          affected_rows?: number | null
          camera_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          ip?: string | null
          kek_version_from?: number | null
          kek_version_to?: number | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      cameras: {
        Row: {
          alerts_count: number | null
          channel_number: number | null
          created_at: string
          detected_people: number | null
          id: string
          last_activity: string | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          nvr_id: string | null
          ptz_capable: boolean
          status: Database["public"]["Enums"]["camera_status"]
          stream_url: string | null
          substream_enabled: boolean
          substream_protocol: string | null
          substream_url: string | null
          thumbnail: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          alerts_count?: number | null
          channel_number?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          nvr_id?: string | null
          ptz_capable?: boolean
          status?: Database["public"]["Enums"]["camera_status"]
          stream_url?: string | null
          substream_enabled?: boolean
          substream_protocol?: string | null
          substream_url?: string | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          alerts_count?: number | null
          channel_number?: number | null
          created_at?: string
          detected_people?: number | null
          id?: string
          last_activity?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          nvr_id?: string | null
          ptz_capable?: boolean
          status?: Database["public"]["Enums"]["camera_status"]
          stream_url?: string | null
          substream_enabled?: boolean
          substream_protocol?: string | null
          substream_url?: string | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cameras_nvr_id_fkey"
            columns: ["nvr_id"]
            isOneToOne: false
            referencedRelation: "nvrs"
            referencedColumns: ["id"]
          },
        ]
      }
      connectivity_resolution_telemetry: {
        Row: {
          camera_id: string | null
          chosen_path: string
          created_at: string
          duration_ms: number | null
          error_code: string
          id: string
          metadata: Json
          original_host: string | null
          original_port: number | null
          public_host: string | null
          public_port: number | null
          relay_agent_id: string | null
          retry_error_code: string | null
          succeeded: boolean | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          chosen_path: string
          created_at?: string
          duration_ms?: number | null
          error_code: string
          id?: string
          metadata?: Json
          original_host?: string | null
          original_port?: number | null
          public_host?: string | null
          public_port?: number | null
          relay_agent_id?: string | null
          retry_error_code?: string | null
          succeeded?: boolean | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          chosen_path?: string
          created_at?: string
          duration_ms?: number | null
          error_code?: string
          id?: string
          metadata?: Json
          original_host?: string | null
          original_port?: number | null
          public_host?: string | null
          public_port?: number | null
          relay_agent_id?: string | null
          retry_error_code?: string | null
          succeeded?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connectivity_resolution_telemetry_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connectivity_resolution_telemetry_relay_agent_id_fkey"
            columns: ["relay_agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_watchdog_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgement_note: string | null
          consecutive_failures: number
          created_at: string
          dedup_key: string | null
          delivered: boolean
          delivery_error: string | null
          details: Json
          escalated_at: string
          id: string
          jobname: string
          last_reason: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgement_note?: string | null
          consecutive_failures: number
          created_at?: string
          dedup_key?: string | null
          delivered?: boolean
          delivery_error?: string | null
          details?: Json
          escalated_at?: string
          id?: string
          jobname: string
          last_reason?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgement_note?: string | null
          consecutive_failures?: number
          created_at?: string
          dedup_key?: string | null
          delivered?: boolean
          delivery_error?: string | null
          details?: Json
          escalated_at?: string
          id?: string
          jobname?: string
          last_reason?: string | null
        }
        Relationships: []
      }
      cron_watchdog_runs: {
        Row: {
          alerts_sent: number
          created_at: string
          dedup_skipped: number
          delivered: boolean
          delivery_error: string | null
          details: Json
          id: string
          jobs_total: number
          min_failures: number
          problems: number
          ran_at: string
          stale_minutes: number
        }
        Insert: {
          alerts_sent?: number
          created_at?: string
          dedup_skipped?: number
          delivered?: boolean
          delivery_error?: string | null
          details?: Json
          id?: string
          jobs_total?: number
          min_failures: number
          problems?: number
          ran_at?: string
          stale_minutes: number
        }
        Update: {
          alerts_sent?: number
          created_at?: string
          dedup_skipped?: number
          delivered?: boolean
          delivery_error?: string | null
          details?: Json
          id?: string
          jobs_total?: number
          min_failures?: number
          problems?: number
          ran_at?: string
          stale_minutes?: number
        }
        Relationships: []
      }
      csp_violation_reports: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          created_at: string
          disposition: string | null
          document_uri: string | null
          effective_directive: string | null
          id: string
          ip_hash: string | null
          line_number: number | null
          original_policy: string | null
          raw_report: Json
          referrer: string | null
          source_file: string | null
          status_code: number | null
          user_agent: string | null
          violated_directive: string | null
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: string
          ip_hash?: string | null
          line_number?: number | null
          original_policy?: string | null
          raw_report: Json
          referrer?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: string
          ip_hash?: string | null
          line_number?: number | null
          original_policy?: string | null
          raw_report?: Json
          referrer?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Relationships: []
      }
      db_health_snapshots: {
        Row: {
          blks_hit: number
          blks_read: number
          cache_hit_ratio: number | null
          captured_at: string
          connections_active: number
          connections_idle: number
          connections_idle_in_tx: number
          connections_total: number
          db_size_bytes: number
          deadlocks: number
          id: string
          metadata: Json
          temp_bytes: number
          xact_commit: number
          xact_rollback: number
        }
        Insert: {
          blks_hit: number
          blks_read: number
          cache_hit_ratio?: number | null
          captured_at?: string
          connections_active: number
          connections_idle: number
          connections_idle_in_tx: number
          connections_total: number
          db_size_bytes: number
          deadlocks: number
          id?: string
          metadata?: Json
          temp_bytes: number
          xact_commit: number
          xact_rollback: number
        }
        Update: {
          blks_hit?: number
          blks_read?: number
          cache_hit_ratio?: number | null
          captured_at?: string
          connections_active?: number
          connections_idle?: number
          connections_idle_in_tx?: number
          connections_total?: number
          db_size_bytes?: number
          deadlocks?: number
          id?: string
          metadata?: Json
          temp_bytes?: number
          xact_commit?: number
          xact_rollback?: number
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
      dry_run_report_snapshots: {
        Row: {
          created_at: string
          id: string
          report: Json
          scope: string | null
          scope_ids: string[] | null
          session_expires_at: string | null
          session_id: string | null
          session_started_at: string | null
          summary: Json
          title: string
          total_events: number
          total_notifying: number
          total_suppressed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report?: Json
          scope?: string | null
          scope_ids?: string[] | null
          session_expires_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          summary?: Json
          title?: string
          total_events?: number
          total_notifying?: number
          total_suppressed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report?: Json
          scope?: string | null
          scope_ids?: string[] | null
          session_expires_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          summary?: Json
          title?: string
          total_events?: number
          total_notifying?: number
          total_suppressed?: number
          updated_at?: string
          user_id?: string
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
      edge_function_error_audit: {
        Row: {
          camera_id: string | null
          context: Json
          created_at: string
          error_code: string
          function_name: string
          hint: string | null
          http_status: number | null
          id: string
          message: string | null
          relay_agent_id: string | null
          request_id: string | null
          run_from: string
          target_host: string | null
          target_ip: string | null
          user_id: string | null
        }
        Insert: {
          camera_id?: string | null
          context?: Json
          created_at?: string
          error_code: string
          function_name: string
          hint?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          relay_agent_id?: string | null
          request_id?: string | null
          run_from?: string
          target_host?: string | null
          target_ip?: string | null
          user_id?: string | null
        }
        Update: {
          camera_id?: string | null
          context?: Json
          created_at?: string
          error_code?: string
          function_name?: string
          hint?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          relay_agent_id?: string | null
          request_id?: string | null
          run_from?: string
          target_host?: string | null
          target_ip?: string | null
          user_id?: string | null
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
          is_test: boolean
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
          is_test?: boolean
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
          is_test?: boolean
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
      firmware_fingerprint_events: {
        Row: {
          created_at: string
          evidence: Json
          id: string
          matched_count: number
          sha256: string
          size_bytes: number | null
          source: string
          top_brand: string | null
          top_profile_id: string | null
          top_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          id?: string
          matched_count?: number
          sha256: string
          size_bytes?: number | null
          source: string
          top_brand?: string | null
          top_profile_id?: string | null
          top_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          id?: string
          matched_count?: number
          sha256?: string
          size_bytes?: number | null
          source?: string
          top_brand?: string | null
          top_profile_id?: string | null
          top_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      glacier_stuck_alerts: {
        Row: {
          alerted_at: string
          asset_id: string
          channel: string
          created_at: string
          delivered: boolean
          error_message: string | null
          hours_stuck: number
          id: string
        }
        Insert: {
          alerted_at?: string
          asset_id: string
          channel?: string
          created_at?: string
          delivered?: boolean
          error_message?: string | null
          hours_stuck: number
          id?: string
        }
        Update: {
          alerted_at?: string
          asset_id?: string
          channel?: string
          created_at?: string
          delivered?: boolean
          error_message?: string | null
          hours_stuck?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glacier_stuck_alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
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
      local_agents: {
        Row: {
          created_at: string
          id: string
          last_ip: unknown
          last_seen_at: string | null
          name: string
          network_cidr: string | null
          status: string
          token_hash: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_ip?: unknown
          last_seen_at?: string | null
          name: string
          network_cidr?: string | null
          status?: string
          token_hash: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_ip?: unknown
          last_seen_at?: string | null
          name?: string
          network_cidr?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      maintenance_alert_dispatches: {
        Row: {
          alert_id: string
          attempts: number
          channel: string
          created_at: string
          detail: Json
          id: string
          last_attempt_at: string
          last_error: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          channel: string
          created_at?: string
          detail?: Json
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          channel?: string
          created_at?: string
          detail?: Json
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alert_dispatches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "maintenance_alert_events"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alert_escalations: {
        Row: {
          age_minutes: number
          alert_id: string
          created_at: string
          detail: Json
          emitted_alert: boolean
          from_level: number
          id: string
          reason: string
          to_level: number
          updated_at: string
        }
        Insert: {
          age_minutes: number
          alert_id: string
          created_at?: string
          detail?: Json
          emitted_alert?: boolean
          from_level: number
          id?: string
          reason: string
          to_level: number
          updated_at?: string
        }
        Update: {
          age_minutes?: number
          alert_id?: string
          created_at?: string
          detail?: Json
          emitted_alert?: boolean
          from_level?: number
          id?: string
          reason?: string
          to_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alert_escalations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "maintenance_alert_events"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alert_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          detail: Json
          escalation_level: number
          id: string
          last_escalated_at: string | null
          observed_at: string | null
          reason: string
          routine: string
          severity: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: Json
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          observed_at?: string | null
          reason: string
          routine: string
          severity: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: Json
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          observed_at?: string | null
          reason?: string
          routine?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          archived_at: string | null
          bucket: string
          camera_id: string
          captured_at: string
          checksum_sha256: string
          created_at: string
          duration_seconds: number | null
          expires_at: string | null
          id: string
          legal_hold: boolean
          metadata: Json
          mime_type: string
          object_key: string
          promoted_at: string | null
          restore_available_until: string | null
          restore_expires_at: string | null
          restore_requested_at: string | null
          restore_status: Database["public"]["Enums"]["restore_status"]
          retention_class: Database["public"]["Enums"]["retention_class"]
          size_bytes: number
          storage_class: string | null
          storage_tier: Database["public"]["Enums"]["storage_tier"]
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          bucket: string
          camera_id: string
          captured_at?: string
          checksum_sha256: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          legal_hold?: boolean
          metadata?: Json
          mime_type?: string
          object_key: string
          promoted_at?: string | null
          restore_available_until?: string | null
          restore_expires_at?: string | null
          restore_requested_at?: string | null
          restore_status?: Database["public"]["Enums"]["restore_status"]
          retention_class?: Database["public"]["Enums"]["retention_class"]
          size_bytes: number
          storage_class?: string | null
          storage_tier?: Database["public"]["Enums"]["storage_tier"]
          type: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          bucket?: string
          camera_id?: string
          captured_at?: string
          checksum_sha256?: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          legal_hold?: boolean
          metadata?: Json
          mime_type?: string
          object_key?: string
          promoted_at?: string | null
          restore_available_until?: string | null
          restore_expires_at?: string | null
          restore_requested_at?: string | null
          restore_status?: Database["public"]["Enums"]["restore_status"]
          retention_class?: Database["public"]["Enums"]["retention_class"]
          size_bytes?: number
          storage_class?: string | null
          storage_tier?: Database["public"]["Enums"]["storage_tier"]
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      media_forget_audit: {
        Row: {
          cold_deleted: number
          created_at: string
          dry_run: boolean
          errors: Json
          executed_by: string
          hot_deleted: number
          id: string
          legal_hold_skipped: number
          reason: string
          requested_by: string
          subject_user_id: string
          warm_deleted: number
        }
        Insert: {
          cold_deleted?: number
          created_at?: string
          dry_run?: boolean
          errors?: Json
          executed_by: string
          hot_deleted?: number
          id?: string
          legal_hold_skipped?: number
          reason: string
          requested_by: string
          subject_user_id: string
          warm_deleted?: number
        }
        Update: {
          cold_deleted?: number
          created_at?: string
          dry_run?: boolean
          errors?: Json
          executed_by?: string
          hot_deleted?: number
          id?: string
          legal_hold_skipped?: number
          reason?: string
          requested_by?: string
          subject_user_id?: string
          warm_deleted?: number
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
      monitor_group_cameras: {
        Row: {
          camera_id: string
          created_at: string
          group_id: string
          id: string
          slot_index: number
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          group_id: string
          id?: string
          slot_index: number
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          group_id?: string
          id?: string
          slot_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_group_cameras_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_group_cameras_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitor_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_groups: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motion_masks: {
        Row: {
          camera_id: string
          color: string
          created_at: string
          enabled: boolean
          id: string
          mode: string
          name: string
          polygon: Json
          sensitivity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          color?: string
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          name: string
          polygon: Json
          sensitivity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          color?: string
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          name?: string
          polygon?: Json
          sensitivity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motion_masks_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
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
      notification_dispatches: {
        Row: {
          alert_id: string
          camera_id: string | null
          camera_name: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          destination: string
          error: string | null
          id: string
          message: string
          recipient_id: string
          sent_at: string | null
          sent_by: string | null
          severity: Database["public"]["Enums"]["event_alert_severity"]
          status: Database["public"]["Enums"]["notification_dispatch_status"]
          subject: string
          user_id: string
          wa_link: string | null
        }
        Insert: {
          alert_id: string
          camera_id?: string | null
          camera_name?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          destination: string
          error?: string | null
          id?: string
          message: string
          recipient_id: string
          sent_at?: string | null
          sent_by?: string | null
          severity: Database["public"]["Enums"]["event_alert_severity"]
          status?: Database["public"]["Enums"]["notification_dispatch_status"]
          subject: string
          user_id: string
          wa_link?: string | null
        }
        Update: {
          alert_id?: string
          camera_id?: string | null
          camera_name?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          destination?: string
          error?: string | null
          id?: string
          message?: string
          recipient_id?: string
          sent_at?: string | null
          sent_by?: string | null
          severity?: Database["public"]["Enums"]["event_alert_severity"]
          status?: Database["public"]["Enums"]["notification_dispatch_status"]
          subject?: string
          user_id?: string
          wa_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "event_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatches_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "notification_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          active: boolean
          channels: Database["public"]["Enums"]["notification_channel"][]
          created_at: string
          email: string | null
          id: string
          min_severity: Database["public"]["Enums"]["event_alert_severity"]
          name: string
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          active?: boolean
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          email?: string | null
          id?: string
          min_severity?: Database["public"]["Enums"]["event_alert_severity"]
          name: string
          updated_at?: string
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          active?: boolean
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          email?: string | null
          id?: string
          min_severity?: Database["public"]["Enums"]["event_alert_severity"]
          name?: string
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      nvr_recording_downloads: {
        Row: {
          attempts: number
          bytes_downloaded: number
          channel: number
          completed_at: string | null
          conversion_error: string | null
          conversion_status: string | null
          converted_at: string | null
          converted_bytes: number | null
          converted_storage_path: string | null
          created_at: string
          end_time: string
          id: string
          last_error: string | null
          max_attempts: number
          nvr_id: string
          progress_percent: number
          remote_file_path: string | null
          source_format: string | null
          start_time: string
          started_at: string | null
          status: string
          storage_bucket: string
          storage_path: string | null
          stream_type: string
          total_bytes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          bytes_downloaded?: number
          channel: number
          completed_at?: string | null
          conversion_error?: string | null
          conversion_status?: string | null
          converted_at?: string | null
          converted_bytes?: number | null
          converted_storage_path?: string | null
          created_at?: string
          end_time: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          nvr_id: string
          progress_percent?: number
          remote_file_path?: string | null
          source_format?: string | null
          start_time: string
          started_at?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          stream_type?: string
          total_bytes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          bytes_downloaded?: number
          channel?: number
          completed_at?: string | null
          conversion_error?: string | null
          conversion_status?: string | null
          converted_at?: string | null
          converted_bytes?: number | null
          converted_storage_path?: string | null
          created_at?: string
          end_time?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          nvr_id?: string
          progress_percent?: number
          remote_file_path?: string | null
          source_format?: string | null
          start_time?: string
          started_at?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          stream_type?: string
          total_bytes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nvr_recording_downloads_nvr_id_fkey"
            columns: ["nvr_id"]
            isOneToOne: false
            referencedRelation: "nvrs"
            referencedColumns: ["id"]
          },
        ]
      }
      nvrs: {
        Row: {
          agent_id: string | null
          brand: string
          channel_count: number
          created_at: string
          host: string
          id: string
          location: string | null
          name: string
          notes: string | null
          rtsp_port: number
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          brand?: string
          channel_count?: number
          created_at?: string
          host: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          rtsp_port?: number
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          brand?: string
          channel_count?: number
          created_at?: string
          host?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          rtsp_port?: number
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nvrs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
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
      partition_backlog_samples: {
        Row: {
          created_at: string
          default_partition: string
          duration_ms: number
          id: string
          parent_table: string
          row_count: number
          sampled_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_partition: string
          duration_ms?: number
          id?: string
          parent_table: string
          row_count?: number
          sampled_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_partition?: string
          duration_ms?: number
          id?: string
          parent_table?: string
          row_count?: number
          sampled_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partition_drain_runs: {
        Row: {
          batch_size: number | null
          created_at: string
          details: Json
          duration_ms: number | null
          error_detail: string | null
          id: string
          locked_out: boolean
          max_batches: number | null
          months_ahead: number | null
          months_back: number | null
          moved_rows: number
          ok: boolean
          parents: string[]
          quarantined: number
          ran_at: string
          updated_at: string
        }
        Insert: {
          batch_size?: number | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error_detail?: string | null
          id?: string
          locked_out?: boolean
          max_batches?: number | null
          months_ahead?: number | null
          months_back?: number | null
          moved_rows?: number
          ok?: boolean
          parents?: string[]
          quarantined?: number
          ran_at?: string
          updated_at?: string
        }
        Update: {
          batch_size?: number | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error_detail?: string | null
          id?: string
          locked_out?: boolean
          max_batches?: number | null
          months_ahead?: number | null
          months_back?: number | null
          moved_rows?: number
          ok?: boolean
          parents?: string[]
          quarantined?: number
          ran_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partition_maintenance_runs: {
        Row: {
          created_at: string
          defaults_added: string[]
          duration_ms: number
          ensured: string[]
          error_detail: string | null
          hardened: string[]
          id: string
          months_ahead: number
          ok: boolean
          parents: string[]
          ran_at: string
          skipped: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          defaults_added?: string[]
          duration_ms?: number
          ensured?: string[]
          error_detail?: string | null
          hardened?: string[]
          id?: string
          months_ahead?: number
          ok?: boolean
          parents?: string[]
          ran_at?: string
          skipped?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          defaults_added?: string[]
          duration_ms?: number
          ensured?: string[]
          error_detail?: string | null
          hardened?: string[]
          id?: string
          months_ahead?: number
          ok?: boolean
          parents?: string[]
          ran_at?: string
          skipped?: Json
          updated_at?: string
        }
        Relationships: []
      }
      partition_quarantine_runs: {
        Row: {
          buckets: Json
          created_at: string
          duration_ms: number
          error_detail: string | null
          id: string
          locked_out: boolean
          months_ahead: number
          months_back: number
          ok: boolean
          parents: string[]
          ran_at: string
          total_drainable: number
          total_quarantined: number
          updated_at: string
        }
        Insert: {
          buckets?: Json
          created_at?: string
          duration_ms?: number
          error_detail?: string | null
          id?: string
          locked_out?: boolean
          months_ahead?: number
          months_back?: number
          ok?: boolean
          parents?: string[]
          ran_at?: string
          total_drainable?: number
          total_quarantined?: number
          updated_at?: string
        }
        Update: {
          buckets?: Json
          created_at?: string
          duration_ms?: number
          error_detail?: string | null
          id?: string
          locked_out?: boolean
          months_ahead?: number
          months_back?: number
          ok?: boolean
          parents?: string[]
          ran_at?: string
          total_drainable?: number
          total_quarantined?: number
          updated_at?: string
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
      plate_detections_default: {
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
      preview_telemetry_events: {
        Row: {
          browser: string | null
          browser_version: string | null
          camera_id: string | null
          codec: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          event_type: string
          extensions: number | null
          height: number | null
          id: string
          latency_ms: number | null
          metadata: Json
          network_type: string | null
          os: string | null
          reason: string | null
          resolution: string | null
          session_id: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          camera_id?: string | null
          codec?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          event_type: string
          extensions?: number | null
          height?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          network_type?: string | null
          os?: string | null
          reason?: string | null
          resolution?: string | null
          session_id?: string | null
          user_id?: string
          width?: number | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          camera_id?: string | null
          codec?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          event_type?: string
          extensions?: number | null
          height?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          network_type?: string | null
          os?: string | null
          reason?: string | null
          resolution?: string | null
          session_id?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      productivity_metric_preferences: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          severities: string[]
          updated_at: string
          user_id: string
          weekdays: number[]
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          event_types?: string[]
          id?: string
          severities?: string[]
          updated_at?: string
          user_id: string
          weekdays?: number[]
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          severities?: string[]
          updated_at?: string
          user_id?: string
          weekdays?: number[]
          window_end?: string
          window_start?: string
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
      ptz_connection_attempts: {
        Row: {
          backend: string
          camera_id: string
          created_at: string
          error_detail: string | null
          http_status: number
          id: string
          latency_ms: number
          ok: boolean
          profile_id: string | null
          reachable: boolean
          relay_agent_id: string | null
          source: string
          used_relay: boolean
          user_id: string
        }
        Insert: {
          backend: string
          camera_id: string
          created_at?: string
          error_detail?: string | null
          http_status?: number
          id?: string
          latency_ms?: number
          ok?: boolean
          profile_id?: string | null
          reachable?: boolean
          relay_agent_id?: string | null
          source?: string
          used_relay?: boolean
          user_id: string
        }
        Update: {
          backend?: string
          camera_id?: string
          created_at?: string
          error_detail?: string | null
          http_status?: number
          id?: string
          latency_ms?: number
          ok?: boolean
          profile_id?: string | null
          reachable?: boolean
          relay_agent_id?: string | null
          source?: string
          used_relay?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptz_connection_attempts_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptz_connection_attempts_relay_agent_id_fkey"
            columns: ["relay_agent_id"]
            isOneToOne: false
            referencedRelation: "local_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ptz_preflight_runs: {
        Row: {
          aborted: boolean
          ack_area_clear: boolean
          ack_confirmed_at: string | null
          ack_watching_live: boolean
          axis: string
          camera_id: string
          created_at: string
          id: string
          limits_snapshot: Json | null
          outcome: string
          phases: Json
          status_supported: boolean
          user_id: string
        }
        Insert: {
          aborted?: boolean
          ack_area_clear?: boolean
          ack_confirmed_at?: string | null
          ack_watching_live?: boolean
          axis: string
          camera_id: string
          created_at?: string
          id?: string
          limits_snapshot?: Json | null
          outcome: string
          phases?: Json
          status_supported?: boolean
          user_id: string
        }
        Update: {
          aborted?: boolean
          ack_area_clear?: boolean
          ack_confirmed_at?: string | null
          ack_watching_live?: boolean
          axis?: string
          camera_id?: string
          created_at?: string
          id?: string
          limits_snapshot?: Json | null
          outcome?: string
          phases?: Json
          status_supported?: boolean
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
      recognition_logs_default: {
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
      root_cause_correlation_runs: {
        Row: {
          cameras_considered: number
          created_at: string
          duration_ms: number | null
          error_detail: string | null
          growth: Json
          id: string
          ok: boolean
          parents_analyzed: number
          ran_at: string
          skew_findings: Json
          updated_at: string
          window_hours: number
        }
        Insert: {
          cameras_considered?: number
          created_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          growth?: Json
          id?: string
          ok?: boolean
          parents_analyzed?: number
          ran_at?: string
          skew_findings?: Json
          updated_at?: string
          window_hours: number
        }
        Update: {
          cameras_considered?: number
          created_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          growth?: Json
          id?: string
          ok?: boolean
          parents_analyzed?: number
          ran_at?: string
          skew_findings?: Json
          updated_at?: string
          window_hours?: number
        }
        Relationships: []
      }
      rtsp_preview_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          path_name: string
          rtsp_url_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          path_name: string
          rtsp_url_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          path_name?: string
          rtsp_url_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rtsp_revalidation_schedules: {
        Row: {
          camera_id: string
          created_at: string
          enabled: boolean
          id: string
          interval_minutes: number
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          next_run_at: string
          targets: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string
          targets?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          next_run_at?: string
          targets?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rtsp_revalidation_schedules_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_executions: {
        Row: {
          actions_executed: string[]
          alert_id: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          is_test: boolean
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
          is_test?: boolean
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
          is_test?: boolean
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
          schedule_cron: string | null
          schedule_tz: string
          severity: Database["public"]["Enums"]["rule_severity"]
          updated_at: string
          user_id: string
          zone_id: string | null
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
          schedule_cron?: string | null
          schedule_tz?: string
          severity?: Database["public"]["Enums"]["rule_severity"]
          updated_at?: string
          user_id?: string
          zone_id?: string | null
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
          schedule_cron?: string | null
          schedule_tz?: string
          severity?: Database["public"]["Enums"]["rule_severity"]
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_tiering_runs: {
        Row: {
          created_at: string
          details: Json
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          processed_count: number
          started_at: string
          status: string
          tier: string
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          processed_count?: number
          started_at?: string
          status: string
          tier: string
        }
        Update: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          processed_count?: number
          started_at?: string
          status?: string
          tier?: string
        }
        Relationships: []
      }
      stream_alert_thresholds: {
        Row: {
          camera_id: string | null
          consecutive_threshold: number
          cooldown_minutes: number
          created_at: string
          critical_jitter_ms: number
          critical_latency_ms: number
          critical_loss_pct: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          consecutive_threshold?: number
          cooldown_minutes?: number
          created_at?: string
          critical_jitter_ms?: number
          critical_latency_ms?: number
          critical_loss_pct?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string | null
          consecutive_threshold?: number
          cooldown_minutes?: number
          created_at?: string
          critical_jitter_ms?: number
          critical_latency_ms?: number
          critical_loss_pct?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_alert_thresholds_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_health_checks: {
        Row: {
          camera_id: string
          created_at: string
          http_code: number | null
          id: string
          latency_ms: number | null
          message: string | null
          score: string | null
          status: string
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          score?: string | null
          status: string
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          score?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_health_checks_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
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
      stream_restart_events: {
        Row: {
          attempt: number
          camera_id: string
          created_at: string
          id: string
          message: string | null
          reason: string
          succeeded: boolean | null
          triggered_by: string
          user_id: string
        }
        Insert: {
          attempt?: number
          camera_id: string
          created_at?: string
          id?: string
          message?: string | null
          reason: string
          succeeded?: boolean | null
          triggered_by?: string
          user_id: string
        }
        Update: {
          attempt?: number
          camera_id?: string
          created_at?: string
          id?: string
          message?: string | null
          reason?: string
          succeeded?: boolean | null
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_restart_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      test_mode_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          detections_count: number
          duration_minutes: number
          ended_at: string | null
          ended_reason: string | null
          expires_at: string
          id: string
          scope: string
          scope_ids: string[]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detections_count?: number
          duration_minutes: number
          ended_at?: string | null
          ended_reason?: string | null
          expires_at: string
          id?: string
          scope: string
          scope_ids?: string[]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detections_count?: number
          duration_minutes?: number
          ended_at?: string | null
          ended_reason?: string | null
          expires_at?: string
          id?: string
          scope?: string
          scope_ids?: string[]
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_mode_suppressions: {
        Row: {
          alert_id: string | null
          camera_id: string | null
          channels: string[] | null
          created_at: string
          id: string
          payload_summary: Json
          reason: string
          rule_id: string | null
          source_function: string
          suppressed_at: string
          trace_id: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          camera_id?: string | null
          channels?: string[] | null
          created_at?: string
          id?: string
          payload_summary?: Json
          reason?: string
          rule_id?: string | null
          source_function: string
          suppressed_at?: string
          trace_id?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          camera_id?: string | null
          channels?: string[] | null
          created_at?: string
          id?: string
          payload_summary?: Json
          reason?: string
          rule_id?: string | null
          source_function?: string
          suppressed_at?: string
          trace_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timelapse_configs: {
        Row: {
          camera_id: string
          capture_interval_minutes: number
          created_at: string
          enabled: boolean
          end_hour: number
          fps: number
          id: string
          last_capture_at: string | null
          last_render_at: string | null
          retention_days: number
          start_hour: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_id: string
          capture_interval_minutes?: number
          created_at?: string
          enabled?: boolean
          end_hour?: number
          fps?: number
          id?: string
          last_capture_at?: string | null
          last_render_at?: string | null
          retention_days?: number
          start_hour?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_id?: string
          capture_interval_minutes?: number
          created_at?: string
          enabled?: boolean
          end_hour?: number
          fps?: number
          id?: string
          last_capture_at?: string | null
          last_render_at?: string | null
          retention_days?: number
          start_hour?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelapse_configs_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      timelapse_snapshots: {
        Row: {
          camera_id: string
          captured_at: string
          config_id: string
          created_at: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          camera_id: string
          captured_at?: string
          config_id: string
          created_at?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          camera_id?: string
          captured_at?: string
          config_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelapse_snapshots_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timelapse_snapshots_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "timelapse_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      timelapse_videos: {
        Row: {
          camera_id: string
          config_id: string
          created_at: string
          duration_seconds: number
          error: string | null
          frame_count: number
          id: string
          rendered_at: string | null
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
          video_date: string
        }
        Insert: {
          camera_id: string
          config_id: string
          created_at?: string
          duration_seconds?: number
          error?: string | null
          frame_count?: number
          id?: string
          rendered_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
          video_date: string
        }
        Update: {
          camera_id?: string
          config_id?: string
          created_at?: string
          duration_seconds?: number
          error?: string | null
          frame_count?: number
          id?: string
          rendered_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
          video_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelapse_videos_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timelapse_videos_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "timelapse_configs"
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
      wizard_telemetry: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          step: string | null
          user_id: string
          wizard_name: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          step?: string | null
          user_id: string
          wizard_name: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          step?: string | null
          user_id?: string
          wizard_name?: string
        }
        Relationships: []
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
      camera_bandwidth_hourly: {
        Row: {
          avg_bitrate_kbps: number | null
          camera_id: string | null
          hour_bucket: string | null
          peak_bitrate_kbps: number | null
          sample_count: number | null
          total_bytes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_bandwidth_samples_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_vault_coverage_alerts: {
        Row: {
          enveloped: number | null
          legacy: number | null
          oldest_wrap: string | null
          severity: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      acknowledge_maintenance_alert: {
        Args: { _alert_id: string }
        Returns: string
      }
      acquire_ptz_lock: {
        Args: { _camera_id: string; _ttl_seconds?: number }
        Returns: Json
      }
      analyze_table: { Args: { _table_name: string }; Returns: Json }
      apply_camera_setup: {
        Args: { _camera_id: string; _rules: Json; _zones: Json }
        Returns: Json
      }
      arbitrate_agent_healing: {
        Args: {
          deliveries: number
          external_root_cause: boolean
          healing_action: string
          healing_severity: string
          redelivery_severity: string
        }
        Returns: Json
      }
      array_days_valid: { Args: { days: number[] }; Returns: boolean }
      audit_cameras_embedded_credentials: {
        Args: never
        Returns: {
          camera_id: string
          name: string
          stream_url_masked: string
        }[]
      }
      audit_rls_coverage: {
        Args: never
        Returns: {
          all_policies: number
          delete_policies: number
          finding: string
          insert_policies: number
          is_partition: boolean
          rls_enabled: boolean
          rls_forced: boolean
          schema_name: string
          select_policies: number
          severity: string
          table_name: string
          total_policies: number
          update_policies: number
        }[]
      }
      backfill_envelope_encryption: {
        Args: { p_kek: string; p_kek_version?: number; p_limit?: number }
        Returns: {
          failed: number
          migrated: number
          remaining: number
        }[]
      }
      capture_db_health_snapshot: { Args: never; Returns: string }
      check_csp_anomaly: { Args: never; Returns: Json }
      check_relay_purge_watchdog: { Args: never; Returns: undefined }
      check_relay_reliability_and_alert: { Args: never; Returns: number }
      claim_agent_relay_tasks: {
        Args: { _agent_id: string; _max?: number }
        Returns: {
          agent_id: string
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          expires_at: string
          id: string
          kind: string
          last_error: string | null
          lease_expires_at: string | null
          request: Json
          response: Json | null
          scheduled_at: string
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_relay_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_api_usage_logs: { Args: never; Returns: number }
      cleanup_edge_cache: { Args: never; Returns: number }
      cleanup_old_test_events: { Args: never; Returns: number }
      close_expired_test_sessions: { Args: never; Returns: number }
      correlate_backlog_root_cause: {
        Args: { p_window_hours?: number }
        Returns: string
      }
      create_nvr_with_channels: {
        Args: {
          p_brand: string
          p_channel_urls: Json
          p_channels: number
          p_host: string
          p_location: string
          p_name: string
          p_port: number
          p_template_id: string
        }
        Returns: string
      }
      cron_matches: {
        Args: { expr: string; ts: string; tz?: string }
        Returns: boolean
      }
      cron_watchdog_ack_metrics: {
        Args: never
        Returns: {
          ack_rate: number
          acknowledged: number
          mtta_seconds: number
          open: number
          p95_ack_seconds: number
          total_escalations: number
          window_label: string
        }[]
      }
      cron_watchdog_consecutive_problems: {
        Args: { _min_runs?: number }
        Returns: {
          consecutive_problem_runs: number
          distinct_jobs: number
          jobnames: string[]
          last_run_at: string
          total_problems: number
        }[]
      }
      delete_user_data: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      detect_camera_clock_skew: {
        Args: {
          critical_seconds?: number
          lookback_hours?: number
          min_samples?: number
          warn_seconds?: number
        }
        Returns: Json
      }
      ensure_future_partitions: {
        Args: { months_ahead?: number }
        Returns: Json
      }
      envelope_encryption_stats: {
        Args: never
        Returns: {
          by_kek_version: Json
          enveloped: number
          legacy: number
          total: number
        }[]
      }
      escalate_stale_maintenance_alerts: {
        Args: never
        Returns: {
          age_min: number
          escalated_alert_id: string
          new_level: number
          previous_level: number
        }[]
      }
      evaluate_and_restart_streams: { Args: never; Returns: number }
      evaluate_maintenance_alerts: { Args: never; Returns: Json }
      evaluate_relay_redelivery: {
        Args: {
          cooldown_hours?: number
          critical_rate?: number
          hysteresis?: number
          min_samples?: number
          warn_rate?: number
          window_hours?: number
        }
        Returns: Json
      }
      execute_camera_schedules: { Args: never; Returns: number }
      expire_agent_relay_tasks: { Args: never; Returns: number }
      extract_url_credentials: {
        Args: { _url: string }
        Returns: {
          password: string
          sanitized: string
          username: string
        }[]
      }
      find_glacier_stuck_pending_alert: {
        Args: { _dedup_window_hours?: number; _hours_threshold?: number }
        Returns: {
          asset_id: string
          hours_stuck: number
          object_key: string
          user_id: string
        }[]
      }
      get_api_usage_stats: { Args: { _days?: number }; Returns: Json }
      get_autovacuum_overrides: {
        Args: never
        Returns: {
          autovacuum_enabled_override: boolean
          dead_pct: number
          last_autovacuum: string
          last_vacuum: string
          n_dead_tuples: number
          n_live_tuples: number
          recommendation: string
          reloptions: string[]
          scale_factor_override: number
          schema_name: string
          severity: string
          table_name: string
          threshold_override: number
          total_size_bytes: number
          total_size_pretty: string
        }[]
      }
      get_bandwidth_summary: {
        Args: { days?: number }
        Returns: {
          avg_bitrate_kbps: number
          camera_id: string
          camera_name: string
          peak_bitrate_kbps: number
          sample_count: number
          total_gb: number
        }[]
      }
      get_bgwriter_stats: { Args: never; Returns: Json }
      get_blocking_chains: {
        Args: never
        Returns: {
          blocked_app: string
          blocked_pid: number
          blocked_query: string
          blocked_state: string
          blocked_user: string
          blocked_wait_event: string
          blocked_wait_seconds: number
          blocking_app: string
          blocking_pid: number
          blocking_query: string
          blocking_state: string
          blocking_user: string
          lock_mode: string
          lock_type: string
          relation: string
          severity: string
        }[]
      }
      get_blocking_locks: {
        Args: never
        Returns: {
          blocked_pid: number
          blocked_statement: string
          blocked_user: string
          blocked_wait_secs: number
          blocking_pid: number
          blocking_statement: string
          blocking_user: string
        }[]
      }
      get_camera_stream_url: {
        Args: { _camera_id: string; _key: string }
        Returns: string
      }
      get_camera_stream_url_v2: {
        Args: { p_camera_id: string; p_kek: string }
        Returns: string
      }
      get_connection_saturation: { Args: never; Returns: Json }
      get_cron_job_runs: {
        Args: { p_job_name: string; p_limit?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      get_csp_report_stats: { Args: { _days?: number }; Returns: Json }
      get_definer_functions_without_search_path: {
        Args: never
        Returns: {
          arguments: string
          function_name: string
          language: string
          recommendation: string
          schema_name: string
          search_path_config: string
          severity: string
        }[]
      }
      get_disabled_triggers: {
        Args: never
        Returns: {
          function_name: string
          recommendation: string
          schema_name: string
          severity: string
          table_name: string
          trigger_kind: string
          trigger_name: string
          trigger_state: string
        }[]
      }
      get_duplicate_indexes: {
        Args: never
        Returns: {
          a_is_unique: boolean
          b_is_unique: boolean
          index_a: string
          index_b: string
          relation: string
          schema_name: string
          size_a_pretty: string
          size_b_pretty: string
          suggestion: string
          table_name: string
        }[]
      }
      get_glacier_restore_status: {
        Args: { _limit?: number }
        Returns: {
          asset_id: string
          camera_id: string
          hours_since_request: number
          is_stuck: boolean
          object_key: string
          restore_available_until: string
          restore_requested_at: string
          restore_status: string
          size_bytes: number
          user_id: string
        }[]
      }
      get_invalid_indexes: {
        Args: never
        Returns: {
          index_name: string
          index_size_bytes: number
          index_size_pretty: string
          is_live: boolean
          is_ready: boolean
          is_unique: boolean
          recommendation: string
          schema_name: string
          severity: string
          table_name: string
        }[]
      }
      get_long_running_sessions: {
        Args: { _active_min_secs?: number; _idle_tx_min_secs?: number }
        Returns: {
          application_name: string
          client_addr: unknown
          pid: number
          query: string
          query_start: string
          runtime_secs: number
          state: string
          state_change: string
          usename: string
          wait_event: string
          wait_event_type: string
        }[]
      }
      get_maintenance_alert_status: {
        Args: never
        Returns: {
          ran_at: string
          reason: string
          routine: string
          severity: string
        }[]
      }
      get_maintenance_progress: { Args: never; Returns: Json }
      get_media_forget_audit: {
        Args: { _limit?: number; _offset?: number; _user_filter?: string }
        Returns: {
          cold_deleted: number
          created_at: string
          dry_run: boolean
          errors: Json
          executed_by: string
          hot_deleted: number
          id: string
          legal_hold_skipped: number
          reason: string
          requested_by: string
          subject_user_id: string
          warm_deleted: number
        }[]
        SetofOptions: {
          from: "*"
          to: "media_forget_audit"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_missing_fk_indexes: {
        Args: never
        Returns: {
          constraint_name: string
          fk_columns: string
          referenced_table: string
          schema_name: string
          suggested_index: string
          table_name: string
          table_size_bytes: number
          table_size_pretty: string
        }[]
      }
      get_missing_updated_at_triggers: {
        Args: never
        Returns: {
          column_name: string
          has_trigger: boolean
          is_partition: boolean
          recommendation: string
          schema_name: string
          severity: string
          table_name: string
        }[]
      }
      get_nullable_foreign_keys: {
        Args: never
        Returns: {
          column_name: string
          constraint_name: string
          estimated_rows: number
          on_delete_action: string
          recommendation: string
          referenced_column: string
          referenced_table: string
          schema_name: string
          severity: string
          table_name: string
          table_size_bytes: number
          table_size_pretty: string
        }[]
      }
      get_operational_metrics: { Args: never; Returns: Json }
      get_partition_coverage: {
        Args: never
        Returns: {
          default_rows_estimate: number
          has_default: boolean
          last_month_covered: string
          months_ahead_covered: number
          parent: string
          partitions_total: number
          unprotected_count: number
        }[]
      }
      get_partition_default_backlog: {
        Args: never
        Returns: {
          default_partition: string
          parent: string
          row_estimate: number
        }[]
      }
      get_partition_quarantine_summary: {
        Args: never
        Returns: {
          default_part: string
          drainable: number
          far_future: number
          far_past: number
          key_column: string
          null_key: number
          orphan_owner: number
          parent: string
          pre_2000: number
          sentinel: number
          total_quarantined: number
        }[]
      }
      get_permissive_rls_policies: {
        Args: never
        Returns: {
          cmd: string
          policyname: string
          qual: string
          recommendation: string
          roles: string[]
          schemaname: string
          severity: string
          tablename: string
          with_check: string
        }[]
      }
      get_preview_telemetry_summary: {
        Args: { window_hours?: number }
        Returns: Json
      }
      get_relay_agent_reliability: {
        Args: { _hours?: number }
        Returns: {
          agent_id: string
          agent_name: string
          avg_latency_ms: number
          completed: number
          expired: number
          failed: number
          last_activity: string
          p95_latency_ms: number
          pending: number
          success_rate: number
          total: number
        }[]
      }
      get_replication_slot_status: {
        Args: never
        Returns: {
          active: boolean
          active_pid: number
          confirmed_flush_lsn: string
          database: string
          plugin: string
          recommendation: string
          restart_lsn: string
          retained_wal_bytes: number
          retained_wal_pretty: string
          severity: string
          slot_name: string
          slot_type: string
        }[]
      }
      get_retention_overview: {
        Args: never
        Returns: {
          deleted_last_30d: number
          health: string
          hours_since_last: number
          job_name: string
          last_run: string
          retention_days: number
          runs_last_30d: number
        }[]
      }
      get_seq_scan_hotspots: {
        Args: { _min_seq_scans?: number; _min_size_mb?: number }
        Returns: {
          avg_rows_per_seq_scan: number
          idx_scan: number
          idx_tup_fetch: number
          n_live_tup: number
          recommendation: string
          schema_name: string
          seq_ratio_pct: number
          seq_scan: number
          seq_tup_read: number
          severity: string
          table_name: string
          table_size_bytes: number
          table_size_pretty: string
        }[]
      }
      get_sequence_exhaustion: {
        Args: never
        Returns: {
          data_type: string
          increment_by: number
          is_cycled: boolean
          last_value: number
          max_value: number
          owned_by_column: string
          owned_by_table: string
          pct_used: number
          schema_name: string
          sequence_name: string
          severity: string
        }[]
      }
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
      get_stats_staleness: {
        Args: { _min_mod_since?: number }
        Returns: {
          hours_since_analyze: number
          last_analyze: string
          last_autoanalyze: string
          mod_ratio_pct: number
          n_live_tup: number
          n_mod_since_analyze: number
          schema_name: string
          severity: string
          table_name: string
        }[]
      }
      get_storage_tier_stats: {
        Args: never
        Returns: {
          asset_count: number
          legal_hold_count: number
          newest_created_at: string
          oldest_created_at: string
          restore_in_progress_count: number
          retention_class: string
          storage_tier: string
          total_bytes: number
        }[]
      }
      get_storage_tiering_slo: {
        Args: { _window_hours?: number }
        Returns: {
          failed_runs: number
          operation: string
          p50_duration_ms: number
          p95_duration_ms: number
          p99_duration_ms: number
          slo_status: string
          success_rate: number
          success_runs: number
          target_p95_ms: number
          total_runs: number
        }[]
      }
      get_table_bloat_estimate: {
        Args: { _limit?: number; _min_size_mb?: number }
        Returns: {
          dead_ratio: number
          dead_tuples: number
          estimated_bloat_bytes: number
          last_autovacuum: string
          last_vacuum: string
          live_tuples: number
          recommendation: string
          schema_name: string
          table_name: string
          total_bytes: number
        }[]
      }
      get_table_bloat_stats: {
        Args: { _min_dead_rows?: number }
        Returns: {
          dead_ratio_pct: number
          dead_rows: number
          last_analyze: string
          last_autoanalyze: string
          last_autovacuum: string
          last_vacuum: string
          live_rows: number
          n_mod_since_analyze: number
          schema_name: string
          table_name: string
        }[]
      }
      get_table_cache_stats: {
        Args: { _min_activity?: number }
        Returns: {
          heap_hit: number
          heap_hit_ratio: number
          heap_read: number
          idx_hit: number
          idx_hit_ratio: number
          idx_read: number
          schema_name: string
          table_name: string
          table_size_pretty: string
          total_reads: number
        }[]
      }
      get_table_size_stats: {
        Args: { _min_size_mb?: number }
        Returns: {
          heap_bytes: number
          heap_pretty: string
          index_bytes: number
          index_pretty: string
          index_ratio_pct: number
          row_estimate: number
          schema_name: string
          table_name: string
          toast_bytes: number
          toast_pretty: string
          total_bytes: number
          total_pretty: string
        }[]
      }
      get_tables_without_pk: {
        Args: never
        Returns: {
          estimated_rows: number
          has_unique_index: boolean
          recommendation: string
          replica_identity: string
          schema_name: string
          severity: string
          table_name: string
          total_size_bytes: number
          total_size_pretty: string
        }[]
      }
      get_temp_file_offenders: {
        Args: { _limit?: number }
        Returns: {
          avg_temp_bytes_per_call: number
          calls: number
          query_text: string
          scope: string
          temp_blks_read: number
          temp_blks_written: number
          temp_bytes_total: number
          total_time_ms: number
        }[]
      }
      get_temp_files_summary: {
        Args: never
        Returns: {
          datname: string
          stats_reset: string
          temp_bytes: number
          temp_files: number
        }[]
      }
      get_txid_wraparound_status: {
        Args: { _limit?: number }
        Returns: {
          age_ratio_pct: number
          object_name: string
          recommendation: string
          scope: string
          severity: string
          xid_age: number
        }[]
      }
      get_unused_indexes: {
        Args: { _max_scans?: number; _min_size_mb?: number }
        Returns: {
          definition: string
          idx_scan: number
          idx_tup_read: number
          index_name: string
          index_size_bytes: number
          index_size_pretty: string
          is_primary: boolean
          is_unique: boolean
          schema_name: string
          table_name: string
          table_size_bytes: number
        }[]
      }
      get_unvalidated_constraints: {
        Args: never
        Returns: {
          constraint_name: string
          constraint_type: string
          definition: string
          recommendation: string
          schema_name: string
          severity: string
          table_name: string
          total_size_bytes: number
          total_size_pretty: string
          validate_sql: string
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
      heal_local_agents: { Args: never; Returns: Json }
      import_settings_backup: {
        Args: { _payload: Json; _strategy?: string }
        Returns: Json
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_test_mode_active: {
        Args: { _camera_id?: string; _rule_id?: string; _user_id: string }
        Returns: boolean
      }
      list_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          failure_count_24h: number
          jobid: number
          jobname: string
          last_message: string
          last_run: string
          last_status: string
          schedule: string
          success_count_24h: number
        }[]
      }
      list_cron_jobs_service: {
        Args: never
        Returns: {
          active: boolean
          failure_count_24h: number
          jobid: number
          jobname: string
          last_message: string
          last_run: string
          last_status: string
          schedule: string
          success_count_24h: number
        }[]
      }
      partition_maintenance_lock_key: { Args: never; Returns: number }
      point_in_polygon: {
        Args: { _poly: Json; _x: number; _y: number }
        Returns: boolean
      }
      point_triggers_motion: {
        Args: { _camera_id: string; _x: number; _y: number }
        Returns: boolean
      }
      preview_success_alert: {
        Args: {
          p_min_events?: number
          p_threshold?: number
          p_window_hours?: number
        }
        Returns: {
          generated_at: string
          should_alert: boolean
          success_rate: number
          threshold_used: number
          total_failed: number
          total_relevant: number
          total_started: number
          window_hours: number
        }[]
      }
      prune_connectivity_resolution_telemetry: {
        Args: never
        Returns: undefined
      }
      prune_cron_watchdog_escalations: { Args: never; Returns: undefined }
      prune_cron_watchdog_runs: { Args: never; Returns: undefined }
      prune_edge_function_error_audit: { Args: never; Returns: number }
      prune_preview_telemetry_events: {
        Args: never
        Returns: {
          deleted_rows: number
        }[]
      }
      purge_agent_discoveries: {
        Args: { _retention_days?: number }
        Returns: number
      }
      purge_agent_relay_tasks: {
        Args: { _retention_days?: number }
        Returns: {
          deleted: number
          expired: number
        }[]
      }
      purge_bandwidth_samples: { Args: never; Returns: number }
      purge_timelapse_snapshots: { Args: never; Returns: number }
      reap_agent_relay_leases: {
        Args: never
        Returns: {
          expired: number
          requeued: number
        }[]
      }
      relay_lease_policy: {
        Args: never
        Returns: {
          backoff_base_seconds: number
          backoff_max_seconds: number
          hard_deadline_seconds: number
          lease_seconds: number
          max_attempts: number
          min_window_seconds: number
        }[]
      }
      release_ptz_lock: { Args: { _camera_id: string }; Returns: boolean }
      replace_user_role: {
        Args: {
          _admin_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      resolve_schedule_cameras: {
        Args: {
          _camera_id: string
          _group_id: string
          _scope: string
          _user_id: string
        }
        Returns: string[]
      }
      rewrap_camera_vault_kek: {
        Args: {
          p_from_version: number
          p_limit?: number
          p_new_kek: string
          p_old_kek: string
          p_to_version: number
        }
        Returns: {
          remaining: number
          rewrapped_count: number
        }[]
      }
      rotate_camera_dek: {
        Args: { p_camera_id: string; p_kek: string; p_kek_version?: number }
        Returns: boolean
      }
      rotate_camera_vault_key: {
        Args: { new_key: string; old_key: string }
        Returns: {
          new_fingerprint: string
          rotated_count: number
        }[]
      }
      run_index_maintenance: { Args: never; Returns: Json }
      run_retention_cleanup: { Args: never; Returns: Json }
      run_selective_vacuum: {
        Args: { _max_tables?: number; _min_dead_ratio?: number }
        Returns: Json
      }
      sample_partition_backlog: {
        Args: { retention_days?: number }
        Returns: {
          default_partition: string
          parent_table: string
          row_count: number
        }[]
      }
      set_camera_credentials: {
        Args: { _camera_id: string; _key: string; _url: string }
        Returns: string
      }
      set_camera_credentials_v2: {
        Args: {
          p_camera_id: string
          p_kek: string
          p_kek_version?: number
          p_stream_url: string
        }
        Returns: string
      }
      set_media_legal_hold: {
        Args: { _asset_id: string; _legal_hold: boolean; _reason?: string }
        Returns: {
          asset_id: string
          changed: boolean
          legal_hold: boolean
        }[]
      }
      stable_hash32: { Args: { _input: string }; Returns: number }
      system_health: { Args: never; Returns: Json }
      terminate_db_session: {
        Args: { _force?: boolean; _pid: number; _reason?: string }
        Returns: Json
      }
      tick_timelapse_capture: { Args: never; Returns: number }
      triage_default_quarantine: {
        Args: { months_ahead?: number; months_back?: number }
        Returns: Json
      }
      unwrap_dek: {
        Args: { p_kek: string; p_wrapped: string }
        Returns: string
      }
      verify_agent_token: {
        Args: { _token: string }
        Returns: {
          agent_id: string
          agent_user_id: string
        }[]
      }
      wilson_lower_bound: {
        Args: { successes: number; total: number }
        Returns: number
      }
      wrap_dek: { Args: { p_dek: string; p_kek: string }; Returns: string }
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
      media_type: "snapshot" | "clip" | "continuous"
      notification_channel: "email" | "whatsapp"
      notification_dispatch_status: "pending" | "sent" | "skipped" | "failed"
      org_role: "owner" | "admin" | "member" | "viewer"
      restore_status: "none" | "in_progress" | "available" | "expired"
      retention_class: "standard" | "extended" | "forensic"
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
      storage_tier: "hot" | "warm" | "cold"
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
      media_type: ["snapshot", "clip", "continuous"],
      notification_channel: ["email", "whatsapp"],
      notification_dispatch_status: ["pending", "sent", "skipped", "failed"],
      org_role: ["owner", "admin", "member", "viewer"],
      restore_status: ["none", "in_progress", "available", "expired"],
      retention_class: ["standard", "extended", "forensic"],
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
      storage_tier: ["hot", "warm", "cold"],
    },
  },
} as const
