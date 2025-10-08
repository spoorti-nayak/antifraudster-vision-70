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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blocklist: {
        Row: {
          block_type: string
          block_value: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          merchant_id: string | null
          reason: string
        }
        Insert: {
          block_type: string
          block_value: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          reason: string
        }
        Update: {
          block_type?: string
          block_value?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocklist_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          average_transaction: number | null
          blocked_count: number | null
          created_at: string | null
          email: string
          flagged_count: number | null
          id: string
          known_devices: Json | null
          known_ips: Json | null
          known_locations: Json | null
          risk_level: Database["public"]["Enums"]["fraud_risk_level"] | null
          total_spent: number | null
          total_transactions: number | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          average_transaction?: number | null
          blocked_count?: number | null
          created_at?: string | null
          email: string
          flagged_count?: number | null
          id?: string
          known_devices?: Json | null
          known_ips?: Json | null
          known_locations?: Json | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"] | null
          total_spent?: number | null
          total_transactions?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          average_transaction?: number | null
          blocked_count?: number | null
          created_at?: string | null
          email?: string
          flagged_count?: number | null
          id?: string
          known_devices?: Json | null
          known_ips?: Json | null
          known_locations?: Json | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"] | null
          total_spent?: number | null
          total_transactions?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          is_resolved: boolean | null
          merchant_id: string | null
          message: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["fraud_risk_level"]
          transaction_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          merchant_id?: string | null
          message: string
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["fraud_risk_level"]
          transaction_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          merchant_id?: string | null
          message?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["fraud_risk_level"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_patterns: {
        Row: {
          created_at: string | null
          detected_count: number | null
          id: string
          is_active: boolean | null
          pattern_data: Json
          pattern_type: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          detected_count?: number | null
          id?: string
          is_active?: boolean | null
          pattern_data: Json
          pattern_type: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          detected_count?: number | null
          id?: string
          is_active?: boolean | null
          pattern_data?: Json
          pattern_type?: string
          weight?: number | null
        }
        Relationships: []
      }
      merchants: {
        Row: {
          api_key: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ml_training_data: {
        Row: {
          confidence: number | null
          created_at: string | null
          features: Json
          id: string
          label: boolean
          transaction_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          features: Json
          id?: string
          label: boolean
          transaction_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          features?: Json
          id?: string
          label?: boolean
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_data_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          card_bin: string | null
          card_last4: string | null
          created_at: string | null
          currency: string | null
          customer_device: string | null
          customer_email: string
          customer_ip: string
          customer_location: Json | null
          fraud_reasons: Json | null
          fraud_score: number | null
          id: string
          merchant_id: string
          metadata: Json | null
          payment_method: string | null
          risk_level: Database["public"]["Enums"]["fraud_risk_level"] | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          card_bin?: string | null
          card_last4?: string | null
          created_at?: string | null
          currency?: string | null
          customer_device?: string | null
          customer_email: string
          customer_ip: string
          customer_location?: Json | null
          fraud_reasons?: Json | null
          fraud_score?: number | null
          id?: string
          merchant_id: string
          metadata?: Json | null
          payment_method?: string | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"] | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          card_bin?: string | null
          card_last4?: string | null
          created_at?: string | null
          currency?: string | null
          customer_device?: string | null
          customer_email?: string
          customer_ip?: string
          customer_location?: Json | null
          fraud_reasons?: Json | null
          fraud_score?: number | null
          id?: string
          merchant_id?: string
          metadata?: Json | null
          payment_method?: string | null
          risk_level?: Database["public"]["Enums"]["fraud_risk_level"] | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      fraud_risk_level: "low" | "medium" | "high" | "critical"
      payment_status: "pending" | "approved" | "blocked" | "flagged"
      transaction_type: "purchase" | "refund" | "chargeback"
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
      fraud_risk_level: ["low", "medium", "high", "critical"],
      payment_status: ["pending", "approved", "blocked", "flagged"],
      transaction_type: ["purchase", "refund", "chargeback"],
    },
  },
} as const
