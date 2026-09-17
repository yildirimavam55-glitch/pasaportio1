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
      airports: {
        Row: {
          city: string | null
          country_id: string | null
          created_at: string
          iata: string
          icao: string | null
          id: string
          name: string
          timezone: string | null
        }
        Insert: {
          city?: string | null
          country_id?: string | null
          created_at?: string
          iata: string
          icao?: string | null
          id?: string
          name: string
          timezone?: string | null
        }
        Update: {
          city?: string | null
          country_id?: string | null
          created_at?: string
          iata?: string
          icao?: string | null
          id?: string
          name?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airports_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          id: string
          iso2: string
          iso3: string | null
          name: string
          region_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          iso2: string
          iso3?: string | null
          name: string
          region_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          iso2?: string
          iso3?: string | null
          name?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          kind: string
          name: string
          region_id: string | null
          slug: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          region_id?: string | null
          slug: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          region_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_iso: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_locale: Database["public"]["Enums"]["locale_code"]
          updated_at: string
        }
        Insert: {
          country_iso?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          updated_at?: string
        }
        Update: {
          country_iso?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_locale?: Database["public"]["Enums"]["locale_code"]
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          customer_visible: boolean
          enabled: boolean
          service_type: Database["public"]["Enums"]["service_type"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_visible?: boolean
          enabled?: boolean
          service_type: Database["public"]["Enums"]["service_type"]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_visible?: boolean
          enabled?: boolean
          service_type?: Database["public"]["Enums"]["service_type"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"
      alert_type:
        | "PAID_NOT_FULFILLED"
        | "PROVIDER_ERROR"
        | "PROVISIONING_DELAYED"
        | "WEBHOOK_FAILED"
        | "QR_DELIVERY_FAILED"
        | "VOUCHER_DELIVERY_FAILED"
        | "CATALOGUE_SYNC_FAILED"
        | "CATALOGUE_STALE"
        | "LOW_PROVIDER_BALANCE"
        | "MARGIN_BELOW_MINIMUM"
        | "REFUND_REQUEST"
      app_role: "admin" | "customer"
      attribution_source:
        | "GOOGLE_ADS"
        | "META"
        | "TIKTOK"
        | "GOOGLE_ORGANIC"
        | "DIRECT"
        | "CRM"
        | "EMAIL"
        | "WHATSAPP"
        | "AFFILIATE"
        | "PARTNER"
        | "UNKNOWN"
      content_status: "DRAFT" | "PUBLISHED"
      fulfillment_status:
        | "PENDING"
        | "PROCESSING"
        | "FULFILLED"
        | "FAILED"
        | "CANCELLED"
      locale_code: "tr" | "de" | "en"
      order_status:
        | "DRAFT"
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED"
        | "REFUNDED"
      payment_status:
        | "PENDING"
        | "AUTHORIZED"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "PARTIALLY_REFUNDED"
        | "CHARGEBACK"
      pricing_strategy:
        | "MANUAL"
        | "MARKUP_PERCENT"
        | "FIXED_MARKUP"
        | "MINIMUM_MARGIN"
      product_lifecycle:
        | "IMPORTED"
        | "DRAFT"
        | "READY"
        | "PUBLISHED"
        | "PAUSED"
        | "UNAVAILABLE"
        | "ARCHIVED"
      provider_capability:
        | "CATALOGUE"
        | "REAL_TIME_AVAILABILITY"
        | "ORDER"
        | "CANCEL"
        | "REFUND"
        | "QR_OR_VOUCHER"
        | "USAGE"
        | "TOPUP"
        | "WEBHOOKS"
        | "BALANCE"
      refund_status: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED"
      service_type: "ESIM" | "LOUNGE" | "CAR_RENTAL" | "TRANSFER"
      sync_status: "PENDING" | "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED"
      sync_trigger: "SCHEDULED" | "MANUAL" | "WEBHOOK"
      traveler_relation: "SELF" | "PARTNER" | "CHILD" | "OTHER"
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
      alert_status: ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
      alert_type: [
        "PAID_NOT_FULFILLED",
        "PROVIDER_ERROR",
        "PROVISIONING_DELAYED",
        "WEBHOOK_FAILED",
        "QR_DELIVERY_FAILED",
        "VOUCHER_DELIVERY_FAILED",
        "CATALOGUE_SYNC_FAILED",
        "CATALOGUE_STALE",
        "LOW_PROVIDER_BALANCE",
        "MARGIN_BELOW_MINIMUM",
        "REFUND_REQUEST",
      ],
      app_role: ["admin", "customer"],
      attribution_source: [
        "GOOGLE_ADS",
        "META",
        "TIKTOK",
        "GOOGLE_ORGANIC",
        "DIRECT",
        "CRM",
        "EMAIL",
        "WHATSAPP",
        "AFFILIATE",
        "PARTNER",
        "UNKNOWN",
      ],
      content_status: ["DRAFT", "PUBLISHED"],
      fulfillment_status: [
        "PENDING",
        "PROCESSING",
        "FULFILLED",
        "FAILED",
        "CANCELLED",
      ],
      locale_code: ["tr", "de", "en"],
      order_status: [
        "DRAFT",
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ],
      payment_status: [
        "PENDING",
        "AUTHORIZED",
        "PAID",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "CHARGEBACK",
      ],
      pricing_strategy: [
        "MANUAL",
        "MARKUP_PERCENT",
        "FIXED_MARKUP",
        "MINIMUM_MARGIN",
      ],
      product_lifecycle: [
        "IMPORTED",
        "DRAFT",
        "READY",
        "PUBLISHED",
        "PAUSED",
        "UNAVAILABLE",
        "ARCHIVED",
      ],
      provider_capability: [
        "CATALOGUE",
        "REAL_TIME_AVAILABILITY",
        "ORDER",
        "CANCEL",
        "REFUND",
        "QR_OR_VOUCHER",
        "USAGE",
        "TOPUP",
        "WEBHOOKS",
        "BALANCE",
      ],
      refund_status: ["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"],
      service_type: ["ESIM", "LOUNGE", "CAR_RENTAL", "TRANSFER"],
      sync_status: ["PENDING", "RUNNING", "SUCCESS", "PARTIAL", "FAILED"],
      sync_trigger: ["SCHEDULED", "MANUAL", "WEBHOOK"],
      traveler_relation: ["SELF", "PARTNER", "CHILD", "OTHER"],
    },
  },
} as const
