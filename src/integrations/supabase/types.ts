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
      esim_product_details: {
        Row: {
          activation_policy: string | null
          apn_info: Json
          country_id: string | null
          country_iso: string | null
          coverage_country_isos: string[]
          data_gb: number | null
          data_only: boolean | null
          network_operators: string[]
          package_kind: string
          product_id: string
          provider_bundle_id: string | null
          provider_metadata: Json
          region_id: string | null
          supports_5g: boolean | null
          supports_hotspot: boolean | null
          topup_supported: boolean | null
          unlimited_data: boolean
          validity_days: number | null
          validity_start_rule: string | null
        }
        Insert: {
          activation_policy?: string | null
          apn_info?: Json
          country_id?: string | null
          country_iso?: string | null
          coverage_country_isos?: string[]
          data_gb?: number | null
          data_only?: boolean | null
          network_operators?: string[]
          package_kind?: string
          product_id: string
          provider_bundle_id?: string | null
          provider_metadata?: Json
          region_id?: string | null
          supports_5g?: boolean | null
          supports_hotspot?: boolean | null
          topup_supported?: boolean | null
          unlimited_data?: boolean
          validity_days?: number | null
          validity_start_rule?: string | null
        }
        Update: {
          activation_policy?: string | null
          apn_info?: Json
          country_id?: string | null
          country_iso?: string | null
          coverage_country_isos?: string[]
          data_gb?: number | null
          data_only?: boolean | null
          network_operators?: string[]
          package_kind?: string
          product_id?: string
          provider_bundle_id?: string | null
          provider_metadata?: Json
          region_id?: string | null
          supports_5g?: boolean | null
          supports_hotspot?: boolean | null
          topup_supported?: boolean | null
          unlimited_data?: boolean
          validity_days?: number | null
          validity_start_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esim_product_details_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esim_product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esim_product_details_region_id_fkey"
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
      lounge_product_details: {
        Row: {
          adult_rules: Json
          airport_id: string | null
          airside: boolean | null
          amenities: string[]
          arrival_eligible: boolean | null
          boarding_pass_required: boolean | null
          booking_window_hours: number | null
          cancellation_rules: Json
          child_rules: Json
          departure_eligible: boolean | null
          iata: string | null
          lounge_name: string | null
          max_stay_minutes: number | null
          minimum_age: number | null
          opening_hours: Json
          product_id: string
          provider_lounge_id: string | null
          provider_metadata: Json
          terminal: string | null
          timezone: string | null
          transit_eligible: boolean | null
          voucher_required: boolean | null
        }
        Insert: {
          adult_rules?: Json
          airport_id?: string | null
          airside?: boolean | null
          amenities?: string[]
          arrival_eligible?: boolean | null
          boarding_pass_required?: boolean | null
          booking_window_hours?: number | null
          cancellation_rules?: Json
          child_rules?: Json
          departure_eligible?: boolean | null
          iata?: string | null
          lounge_name?: string | null
          max_stay_minutes?: number | null
          minimum_age?: number | null
          opening_hours?: Json
          product_id: string
          provider_lounge_id?: string | null
          provider_metadata?: Json
          terminal?: string | null
          timezone?: string | null
          transit_eligible?: boolean | null
          voucher_required?: boolean | null
        }
        Update: {
          adult_rules?: Json
          airport_id?: string | null
          airside?: boolean | null
          amenities?: string[]
          arrival_eligible?: boolean | null
          boarding_pass_required?: boolean | null
          booking_window_hours?: number | null
          cancellation_rules?: Json
          child_rules?: Json
          departure_eligible?: boolean | null
          iata?: string | null
          lounge_name?: string | null
          max_stay_minutes?: number | null
          minimum_age?: number | null
          opening_hours?: Json
          product_id?: string
          provider_lounge_id?: string | null
          provider_metadata?: Json
          terminal?: string | null
          timezone?: string | null
          transit_eligible?: boolean | null
          voucher_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lounge_product_details_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          fixed_markup: number | null
          id: string
          markup_percent: number | null
          minimum_margin_percent: number | null
          name: string
          priority: number
          provider_id: string | null
          rounding_ending: number | null
          rounding_mode: string
          service_type: Database["public"]["Enums"]["service_type"] | null
          strategy: Database["public"]["Enums"]["pricing_strategy"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          fixed_markup?: number | null
          id?: string
          markup_percent?: number | null
          minimum_margin_percent?: number | null
          name: string
          priority?: number
          provider_id?: string | null
          rounding_ending?: number | null
          rounding_mode?: string
          service_type?: Database["public"]["Enums"]["service_type"] | null
          strategy?: Database["public"]["Enums"]["pricing_strategy"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          fixed_markup?: number | null
          id?: string
          markup_percent?: number | null
          minimum_margin_percent?: number | null
          name?: string
          priority?: number
          provider_id?: string | null
          rounding_ending?: number | null
          rounding_mode?: string
          service_type?: Database["public"]["Enums"]["service_type"] | null
          strategy?: Database["public"]["Enums"]["pricing_strategy"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          description: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          product_id: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          locale: Database["public"]["Enums"]["locale_code"]
          product_id: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          product_id?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
        ]
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
      provider_connections: {
        Row: {
          base_url: string | null
          config: Json
          created_at: string
          credential_secret_names: string[]
          environment: string
          id: string
          last_checked_at: string | null
          last_sync_at: string | null
          provider_id: string
          rate_limit_per_minute: number | null
          status: string
          sync_cron: string | null
          updated_at: string
          webhook_secret_name: string | null
        }
        Insert: {
          base_url?: string | null
          config?: Json
          created_at?: string
          credential_secret_names?: string[]
          environment?: string
          id?: string
          last_checked_at?: string | null
          last_sync_at?: string | null
          provider_id: string
          rate_limit_per_minute?: number | null
          status?: string
          sync_cron?: string | null
          updated_at?: string
          webhook_secret_name?: string | null
        }
        Update: {
          base_url?: string | null
          config?: Json
          created_at?: string
          credential_secret_names?: string[]
          environment?: string
          id?: string
          last_checked_at?: string | null
          last_sync_at?: string | null
          provider_id?: string
          rate_limit_per_minute?: number | null
          status?: string
          sync_cron?: string | null
          updated_at?: string
          webhook_secret_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_product_mappings: {
        Row: {
          available: boolean
          external_id: string
          id: string
          last_synced_at: string | null
          priority: number
          product_id: string
          provider_cost: number | null
          provider_currency: string | null
          provider_id: string
          raw_item_id: string | null
        }
        Insert: {
          available?: boolean
          external_id: string
          id?: string
          last_synced_at?: string | null
          priority?: number
          product_id: string
          provider_cost?: number | null
          provider_currency?: string | null
          provider_id: string
          raw_item_id?: string | null
        }
        Update: {
          available?: boolean
          external_id?: string
          id?: string
          last_synced_at?: string | null
          priority?: number
          product_id?: string
          provider_cost?: number | null
          provider_currency?: string | null
          provider_id?: string
          raw_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_product_mappings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_product_mappings_raw_item_id_fkey"
            columns: ["raw_item_id"]
            isOneToOne: false
            referencedRelation: "provider_raw_items"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_raw_items: {
        Row: {
          available: boolean
          external_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          last_sync_run_id: string | null
          payload: Json
          payload_hash: string
          provider_id: string
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          available?: boolean
          external_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_sync_run_id?: string | null
          payload: Json
          payload_hash: string
          provider_id: string
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          available?: boolean
          external_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_sync_run_id?: string | null
          payload?: Json
          payload_hash?: string
          provider_id?: string
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "provider_raw_items_last_sync_run_id_fkey"
            columns: ["last_sync_run_id"]
            isOneToOne: false
            referencedRelation: "provider_sync_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_raw_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_sync_errors: {
        Row: {
          code: string | null
          context: Json
          created_at: string
          external_id: string | null
          id: string
          message: string
          provider_id: string
          sync_run_id: string | null
        }
        Insert: {
          code?: string | null
          context?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          message: string
          provider_id: string
          sync_run_id?: string | null
        }
        Update: {
          code?: string | null
          context?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          message?: string
          provider_id?: string
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_sync_errors_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sync_errors_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "provider_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_sync_runs: {
        Row: {
          completed_at: string | null
          connection_id: string | null
          error_summary: string | null
          id: string
          idempotency_key: string | null
          items_created: number
          items_failed: number
          items_received: number
          items_unavailable: number
          items_unchanged: number
          items_updated: number
          provider_id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          trigger: Database["public"]["Enums"]["sync_trigger"]
        }
        Insert: {
          completed_at?: string | null
          connection_id?: string | null
          error_summary?: string | null
          id?: string
          idempotency_key?: string | null
          items_created?: number
          items_failed?: number
          items_received?: number
          items_unavailable?: number
          items_unchanged?: number
          items_updated?: number
          provider_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          trigger?: Database["public"]["Enums"]["sync_trigger"]
        }
        Update: {
          completed_at?: string | null
          connection_id?: string | null
          error_summary?: string | null
          id?: string
          idempotency_key?: string | null
          items_created?: number
          items_failed?: number
          items_received?: number
          items_unavailable?: number
          items_unchanged?: number
          items_updated?: number
          provider_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          trigger?: Database["public"]["Enums"]["sync_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "provider_sync_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_sync_runs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          active: boolean
          capabilities: Database["public"]["Enums"]["provider_capability"][]
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          priority: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          capabilities?: Database["public"]["Enums"]["provider_capability"][]
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          priority?: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          capabilities?: Database["public"]["Enums"]["provider_capability"][]
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: number
          service_type?: Database["public"]["Enums"]["service_type"]
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
      service_products: {
        Row: {
          airport_id: string | null
          badge: string | null
          created_at: string
          currency: string
          customer_visible: boolean
          destination_id: string | null
          featured: boolean
          id: string
          lifecycle: Database["public"]["Enums"]["product_lifecycle"]
          margin_flagged: boolean
          name: string
          price_overridden: boolean
          pricing_rule_id: string | null
          primary_provider_id: string | null
          provider_available: boolean
          provider_cost: number | null
          provider_currency: string | null
          provider_external_id: string | null
          provider_synced_at: string | null
          sale_price: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          airport_id?: string | null
          badge?: string | null
          created_at?: string
          currency?: string
          customer_visible?: boolean
          destination_id?: string | null
          featured?: boolean
          id?: string
          lifecycle?: Database["public"]["Enums"]["product_lifecycle"]
          margin_flagged?: boolean
          name: string
          price_overridden?: boolean
          pricing_rule_id?: string | null
          primary_provider_id?: string | null
          provider_available?: boolean
          provider_cost?: number | null
          provider_currency?: string | null
          provider_external_id?: string | null
          provider_synced_at?: string | null
          sale_price?: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          airport_id?: string | null
          badge?: string | null
          created_at?: string
          currency?: string
          customer_visible?: boolean
          destination_id?: string | null
          featured?: boolean
          id?: string
          lifecycle?: Database["public"]["Enums"]["product_lifecycle"]
          margin_flagged?: boolean
          name?: string
          price_overridden?: boolean
          pricing_rule_id?: string | null
          primary_provider_id?: string | null
          provider_available?: boolean
          provider_cost?: number | null
          provider_currency?: string | null
          provider_external_id?: string | null
          provider_synced_at?: string | null
          sale_price?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_products_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_pricing_rule_id_fkey"
            columns: ["pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_service_type_fkey"
            columns: ["service_type"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["service_type"]
          },
        ]
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
