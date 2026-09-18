export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          change_summary: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_action_events: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          id: string
          organization_id: string
          search_event_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          search_event_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          search_event_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_action_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_action_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_action_events_search_event_id_fkey"
            columns: ["search_event_id"]
            isOneToOne: false
            referencedRelation: "vehicle_search_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_action_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          failed_rows: number
          filename: string
          id: string
          importer_id: string | null
          organization_id: string
          status: string
          summary_json: Json | null
          total_rows: number
          valid_rows: number
          warning_rows: number
        }
        Insert: {
          created_at?: string
          failed_rows?: number
          filename: string
          id?: string
          importer_id?: string | null
          organization_id: string
          status?: string
          summary_json?: Json | null
          total_rows?: number
          valid_rows?: number
          warning_rows?: number
        }
        Update: {
          created_at?: string
          failed_rows?: number
          filename?: string
          id?: string
          importer_id?: string | null
          organization_id?: string
          status?: string
          summary_json?: Json | null
          total_rows?: number
          valid_rows?: number
          warning_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_importer_id_fkey"
            columns: ["importer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string
          created_at: string
          default_language: string
          entity_type: string
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string
          onboarding_status: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          default_language?: string
          entity_type?: string
          id?: string
          logo_url?: string | null
          name_ar: string
          name_en: string
          onboarding_status?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          default_language?: string
          entity_type?: string
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          onboarding_status?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      parking_alert_types: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "parking_alert_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type_id: string
          created_at: string
          id: string
          message: string | null
          organization_id: string
          owner_id: string
          reporter_id: string
          resolved_at: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type_id: string
          created_at?: string
          id?: string
          message?: string | null
          organization_id: string
          owner_id: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type_id?: string
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string
          owner_id?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_alerts_alert_type_id_fkey"
            columns: ["alert_type_id"]
            isOneToOne: false
            referencedRelation: "parking_alert_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_alerts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_alerts_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          change_summary: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          change_summary?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string
          id: string
          is_active: boolean
          mobile: string
          name_ar: string
          name_en: string
          organization_id: string
          preferred_language: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id: string
          id: string
          is_active?: boolean
          mobile: string
          name_ar: string
          name_en: string
          organization_id: string
          preferred_language?: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          mobile?: string
          name_ar?: string
          name_en?: string
          organization_id?: string
          preferred_language?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          organization_id: string
          p256dh: string
          profile_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          organization_id: string
          p256dh: string
          profile_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          organization_id?: string
          p256dh?: string
          profile_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_vehicles: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
          staff_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
          staff_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          staff_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_vehicles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          branding: Json | null
          country_calling_code: string
          default_language: string
          id: string
          min_partial_digits: number
          organization_id: string
          partial_search_enabled: boolean
          privacy_mode: string
          retention_days: number
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          branding?: Json | null
          country_calling_code?: string
          default_language?: string
          id?: string
          min_partial_digits?: number
          organization_id: string
          partial_search_enabled?: boolean
          privacy_mode?: string
          retention_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          branding?: Json | null
          country_calling_code?: string
          default_language?: string
          id?: string
          min_partial_digits?: number
          organization_id?: string
          partial_search_enabled?: boolean
          privacy_mode?: string
          retention_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unknown_vehicle_reports: {
        Row: {
          created_at: string
          id: string
          normalized_plate: string
          note: string | null
          organization_id: string
          plate_number: string
          reported_by: string | null
          resolved_at: string | null
          status: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_plate: string
          note?: string | null
          organization_id: string
          plate_number: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          normalized_plate?: string
          note?: string | null
          organization_id?: string
          plate_number?: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unknown_vehicle_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unknown_vehicle_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_search_events: {
        Row: {
          created_at: string
          id: string
          match_type: string
          normalized_query: string
          organization_id: string
          result_count: number
          searched_by: string | null
          selected_vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_type: string
          normalized_query: string
          organization_id: string
          result_count?: number
          searched_by?: string | null
          selected_vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_type?: string
          normalized_query?: string
          organization_id?: string
          result_count?: number
          searched_by?: string | null
          selected_vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_search_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_search_events_searched_by_fkey"
            columns: ["searched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_search_events_selected_vehicle_id_fkey"
            columns: ["selected_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          make: string
          model: string
          normalized_plate: string
          organization_id: string
          permit_issued_at: string
          permit_status: string
          permit_token: string
          plate_number: string
          updated_at: string
          year: number | null
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          make: string
          model: string
          normalized_plate: string
          organization_id: string
          permit_issued_at?: string
          permit_status?: string
          permit_token?: string
          plate_number: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          make?: string
          model?: string
          normalized_plate?: string
          organization_id?: string
          permit_issued_at?: string
          permit_status?: string
          permit_token?: string
          plate_number?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_passes: {
        Row: {
          created_at: string
          host_name: string | null
          host_profile_id: string | null
          id: string
          issued_by: string | null
          normalized_plate: string
          organization_id: string
          permit_token: string
          plate_number: string
          purpose: string | null
          status: string
          valid_from: string
          valid_until: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          visitor_mobile: string
          visitor_name: string
        }
        Insert: {
          created_at?: string
          host_name?: string | null
          host_profile_id?: string | null
          id?: string
          issued_by?: string | null
          normalized_plate: string
          organization_id: string
          permit_token?: string
          plate_number: string
          purpose?: string | null
          status?: string
          valid_from?: string
          valid_until: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          visitor_mobile: string
          visitor_name: string
        }
        Update: {
          created_at?: string
          host_name?: string | null
          host_profile_id?: string | null
          id?: string
          issued_by?: string | null
          normalized_plate?: string
          organization_id?: string
          permit_token?: string
          plate_number?: string
          purpose?: string | null
          status?: string
          valid_from?: string
          valid_until?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          visitor_mobile?: string
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_passes_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_platform_admin: {
        Args: { p_role?: string; p_user_id: string }
        Returns: string
      }
      current_user_org_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      current_user_tenant_role: { Args: never; Returns: string }
      find_vehicle_by_plate: {
        Args: { p_query: string }
        Returns: {
          color: string
          department_name_ar: string
          department_name_en: string
          is_primary: boolean
          make: string
          match_type: string
          model: string
          normalized_plate: string
          owner_employee_id: string
          owner_id: string
          owner_mobile: string
          owner_name_ar: string
          owner_name_en: string
          plate_number: string
          vehicle_id: string
          year: number
        }[]
      }
      get_dashboard_overview: {
        Args: {
          p_range_end: string
          p_range_start: string
          p_timezone?: string
        }
        Returns: Json
      }
      get_platform_organizations_overview: {
        Args: never
        Returns: {
          active_alert_count: number
          created_at: string
          entity_type: string
          member_count: number
          name_ar: string
          name_en: string
          onboarding_status: string
          organization_id: string
          status: string
          vehicle_count: number
        }[]
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_owner: { Args: never; Returns: boolean }
      normalize_plate_number: { Args: { input_text: string }; Returns: string }
      resolve_permit_for_alert: {
        Args: { p_token: string }
        Returns: {
          entity_type: string
          is_valid: boolean
          resolved_organization_id: string
          resolved_owner_id: string
          resolved_vehicle_id: string
          status_reason: string
        }[]
      }
      revoke_platform_admin: { Args: { p_user_id: string }; Returns: boolean }
      revoke_vehicle_permit: {
        Args: { p_vehicle_id: string }
        Returns: boolean
      }
      rotate_vehicle_permit: { Args: { p_vehicle_id: string }; Returns: string }
      set_organization_status: {
        Args: { p_organization_id: string; p_status: string }
        Returns: boolean
      }
      verify_permit_token: {
        Args: { p_token: string }
        Returns: {
          color: string
          is_valid: boolean
          make: string
          model: string
          permit_kind: string
          status_reason: string
          venue_name: string
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

