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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          comment: string | null
          created_at: string
          from_status: string | null
          id: string
          request_id: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          request_id?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          request_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyses: {
        Row: {
          analyzed_at: string | null
          created_at: string
          executive_summary: string | null
          id: string
          inconsistencies: Json
          missing_information: Json
          model: string | null
          provider: string | null
          request_id: string
          risk_signals: Json
          status: string
          updated_at: string
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          inconsistencies?: Json
          missing_information?: Json
          model?: string | null
          provider?: string | null
          request_id: string
          risk_signals?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          inconsistencies?: Json
          missing_information?: Json
          model?: string | null
          provider?: string | null
          request_id?: string
          risk_signals?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cab_conditions: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          condition_text: string
          created_at: string
          developer_response: string | null
          evidence_name: string | null
          evidence_path: string | null
          id: string
          request_id: string
          required: boolean
          status: string
          verification_result: string | null
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          condition_text: string
          created_at?: string
          developer_response?: string | null
          evidence_name?: string | null
          evidence_path?: string | null
          id?: string
          request_id: string
          required?: boolean
          status?: string
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          condition_text?: string
          created_at?: string
          developer_response?: string | null
          evidence_name?: string | null
          evidence_path?: string | null
          id?: string
          request_id?: string
          required?: boolean
          status?: string
          verification_result?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cab_conditions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cab_decisions: {
        Row: {
          comment: string
          decided_at: string
          decided_by: string | null
          decided_by_name: string | null
          decision: string
          id: string
          request_id: string
        }
        Insert: {
          comment: string
          decided_at?: string
          decided_by?: string | null
          decided_by_name?: string | null
          decision: string
          id?: string
          request_id: string
        }
        Update: {
          comment?: string
          decided_at?: string
          decided_by?: string | null
          decided_by_name?: string | null
          decision?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cab_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cab_documents: {
        Row: {
          comment: string | null
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string | null
          id: string
          request_id: string
          review_status: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          request_id: string
          review_status?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          request_id?: string
          review_status?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cab_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cab_requests: {
        Row: {
          cab_date: string | null
          change_type: string
          closed_at: string | null
          created_at: string
          description: string | null
          developer_id: string | null
          developer_name: string | null
          id: string
          issue_category: string | null
          passed_at: string | null
          pm_ba_lead: string | null
          project_code: string
          project_id: string | null
          project_name: string
          qa_source: string | null
          qa_test_status: string
          qa_approval_status: string
          readiness_score: number
          request_code: string
          reviewed_at: string | null
          risk_level: string | null
          risk_score: number | null
          status: string
          submitted_at: string | null
          target_deploy_date: string | null
          target_golive_date: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          cab_date?: string | null
          change_type: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          developer_id?: string | null
          developer_name?: string | null
          id?: string
          issue_category?: string | null
          passed_at?: string | null
          pm_ba_lead?: string | null
          project_code: string
          project_id?: string | null
          project_name: string
          qa_source?: string | null
          qa_test_status?: string
          qa_approval_status?: string
          readiness_score?: number
          request_code: string
          reviewed_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          submitted_at?: string | null
          target_deploy_date?: string | null
          target_golive_date?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          cab_date?: string | null
          change_type?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          developer_id?: string | null
          developer_name?: string | null
          id?: string
          issue_category?: string | null
          passed_at?: string | null
          pm_ba_lead?: string | null
          project_code?: string
          project_id?: string | null
          project_name?: string
          qa_source?: string | null
          qa_test_status?: string
          qa_approval_status?: string
          readiness_score?: number
          request_code?: string
          reviewed_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          submitted_at?: string | null
          target_deploy_date?: string | null
          target_golive_date?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cab_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          attempt: number
          completed_at: string | null
          coordinator_id: string | null
          coordinator_name: string | null
          created_at: string
          deploy_date: string
          environment: string
          id: string
          notes: string | null
          request_id: string
          started_at: string | null
          status: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          coordinator_id?: string | null
          coordinator_name?: string | null
          created_at?: string
          deploy_date: string
          environment?: string
          id?: string
          notes?: string | null
          request_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          window_end: string
          window_start: string
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          coordinator_id?: string | null
          coordinator_name?: string | null
          created_at?: string
          deploy_date?: string
          environment?: string
          id?: string
          notes?: string | null
          request_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          corrective_action: string | null
          created_at: string
          created_by: string | null
          deployment_id: string | null
          description: string | null
          id: string
          request_id: string
          root_cause: string | null
          scope_changed: boolean | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          deployment_id?: string | null
          description?: string | null
          id?: string
          request_id: string
          root_cause?: string | null
          scope_changed?: boolean | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          deployment_id?: string | null
          description?: string | null
          id?: string
          request_id?: string
          root_cause?: string | null
          scope_changed?: boolean | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          owner_lead: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          owner_lead?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          owner_lead?: string | null
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          complexity: number
          dependency: number
          id: string
          level: string
          notes: string | null
          previous_issues: number
          request_id: string
          score: number
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          complexity?: number
          dependency?: number
          id?: string
          level?: string
          notes?: string | null
          previous_issues?: number
          request_id: string
          score?: number
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          complexity?: number
          dependency?: number
          id?: string
          level?: string
          notes?: string | null
          previous_issues?: number
          request_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_reviews: {
        Row: {
          checklist: Json
          findings: string | null
          id: string
          issue_category: string | null
          request_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          section: string
        }
        Insert: {
          checklist?: Json
          findings?: string | null
          id?: string
          issue_category?: string | null
          request_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          section: string
        }
        Update: {
          checklist?: Json
          findings?: string | null
          id?: string
          issue_category?: string | null
          request_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_cab_kpis: {
        Row: {
          active_requests: number | null
          deploy_success_rate: number | null
          high_risk: number | null
          passed: number | null
          pending_review: number | null
        }
        Relationships: []
      }
      v_change_type_stats: {
        Row: {
          change_type: string | null
          total: number | null
        }
        Relationships: []
      }
      v_deployment_trend: {
        Row: {
          completed: number | null
          failed: number | null
          month: string | null
        }
        Relationships: []
      }
      v_funnel: {
        Row: {
          closed: number | null
          deployed: number | null
          passed: number | null
          reviewed: number | null
          scheduled: number | null
          submitted: number | null
        }
        Relationships: []
      }
      v_issue_categories: {
        Row: {
          category: string | null
          total: number | null
        }
        Relationships: []
      }
      v_project_stats: {
        Row: {
          high_risk: number | null
          issues: number | null
          project_code: string | null
          project_name: string | null
          requests: number | null
        }
        Relationships: []
      }
      v_requests_over_time: {
        Row: {
          month: string | null
          total: number | null
        }
        Relationships: []
      }
      v_risk_distribution: {
        Row: {
          level: string | null
          total: number | null
        }
        Relationships: []
      }
      v_turnaround: {
        Row: {
          avg_cab_days: number | null
          avg_passed_to_deploy_days: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "developer"
        | "cab_reviewer"
        | "deployment_coordinator"
        | "executive"
        | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "developer",
        "cab_reviewer",
        "deployment_coordinator",
        "executive",
        "admin",
      ],
    },
  },
} as const
