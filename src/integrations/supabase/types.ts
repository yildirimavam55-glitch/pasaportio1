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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          delivery_state: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          note: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          delivery_state?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          delivery_state?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      airport_content: {
        Row: {
          airport_id: string
          content: Json
          created_at: string
          customer_visible: boolean
          featured: boolean
          id: string
          media_id: string | null
          mobile_media_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          airport_id: string
          content?: Json
          created_at?: string
          customer_visible?: boolean
          featured?: boolean
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          airport_id?: string
          content?: Json
          created_at?: string
          customer_visible?: boolean
          featured?: boolean
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_content_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: true
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_content_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_content_mobile_media_id_fkey"
            columns: ["mobile_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
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
      analytics_events: {
        Row: {
          customer_id: string | null
          event_name: string
          id: string
          locale: Database["public"]["Enums"]["locale_code"] | null
          occurred_at: string
          properties: Json
          service_type: Database["public"]["Enums"]["service_type"] | null
          session_id: string | null
        }
        Insert: {
          customer_id?: string | null
          event_name: string
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"] | null
          occurred_at?: string
          properties?: Json
          service_type?: Database["public"]["Enums"]["service_type"] | null
          session_id?: string | null
        }
        Update: {
          customer_id?: string | null
          event_name?: string
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"] | null
          occurred_at?: string
          properties?: Json
          service_type?: Database["public"]["Enums"]["service_type"] | null
          session_id?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          active: boolean
          airport_id: string | null
          content: Json
          created_at: string
          cta_href: string
          destination_id: string | null
          ends_at: string | null
          id: string
          media_id: string | null
          mobile_media_id: string | null
          name: string
          priority: number
          service_type: Database["public"]["Enums"]["service_type"] | null
          starts_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          airport_id?: string | null
          content?: Json
          created_at?: string
          cta_href?: string
          destination_id?: string | null
          ends_at?: string | null
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          name: string
          priority?: number
          service_type?: Database["public"]["Enums"]["service_type"] | null
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          airport_id?: string | null
          content?: Json
          created_at?: string
          cta_href?: string
          destination_id?: string | null
          ends_at?: string | null
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          name?: string
          priority?: number
          service_type?: Database["public"]["Enums"]["service_type"] | null
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_mobile_media_id_fkey"
            columns: ["mobile_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_documents: {
        Row: {
          created_at: string
          data: Json
          id: string
          key: string
          kind: string
          published_at: string | null
          scheduled_at: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          key: string
          kind?: string
          published_at?: string | null
          scheduled_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          key?: string
          kind?: string
          published_at?: string | null
          scheduled_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      cms_translations: {
        Row: {
          data: Json
          document_id: string
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
        }
        Insert: {
          data?: Json
          document_id: string
          id?: string
          locale: Database["public"]["Enums"]["locale_code"]
        }
        Update: {
          data?: Json
          document_id?: string
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
        }
        Relationships: [
          {
            foreignKeyName: "cms_translations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cms_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cms_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cms_documents"
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
      customer_esims: {
        Row: {
          created_at: string
          customer_id: string | null
          destination_label: string | null
          expires_at: string | null
          iccid: string | null
          id: string
          install_info: Json
          order_item_id: string | null
          package_label: string | null
          qr_payload: string | null
          remaining_data_mb: number | null
          status: string
          topup_supported: boolean
          total_data_mb: number | null
          traveler_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          destination_label?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_info?: Json
          order_item_id?: string | null
          package_label?: string | null
          qr_payload?: string | null
          remaining_data_mb?: number | null
          status?: string
          topup_supported?: boolean
          total_data_mb?: number | null
          traveler_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          destination_label?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_info?: Json
          order_item_id?: string | null
          package_label?: string | null
          qr_payload?: string | null
          remaining_data_mb?: number | null
          status?: string
          topup_supported?: boolean
          total_data_mb?: number | null
          traveler_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_esims_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_lounge_bookings: {
        Row: {
          airport_iata: string | null
          booking_reference: string | null
          created_at: string
          customer_id: string | null
          id: string
          lounge_name: string | null
          order_item_id: string | null
          status: string
          terminal: string | null
          travelers_count: number
          updated_at: string
          visit_at: string | null
          voucher_payload: string | null
        }
        Insert: {
          airport_iata?: string | null
          booking_reference?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lounge_name?: string | null
          order_item_id?: string | null
          status?: string
          terminal?: string | null
          travelers_count?: number
          updated_at?: string
          visit_at?: string | null
          voucher_payload?: string | null
        }
        Update: {
          airport_iata?: string | null
          booking_reference?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lounge_name?: string | null
          order_item_id?: string | null
          status?: string
          terminal?: string | null
          travelers_count?: number
          updated_at?: string
          visit_at?: string | null
          voucher_payload?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_lounge_bookings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_trip_services: {
        Row: {
          created_at: string
          id: string
          order_item_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_trip_services_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_trip_services_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "customer_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_trips: {
        Row: {
          created_at: string
          customer_id: string
          destination_id: string | null
          end_date: string | null
          id: string
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          destination_id?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          destination_id?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_trips_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_content: {
        Row: {
          content: Json
          country_id: string
          created_at: string
          customer_visible: boolean
          featured: boolean
          id: string
          media_id: string | null
          mobile_media_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          country_id: string
          created_at?: string
          customer_visible?: boolean
          featured?: boolean
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          country_id?: string
          created_at?: string
          customer_visible?: boolean
          featured?: boolean
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_content_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_content_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_content_mobile_media_id_fkey"
            columns: ["mobile_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
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
      esim_device_compatibility: {
        Row: {
          active: boolean
          aliases: string[]
          brand: string
          created_at: string
          family: string | null
          id: string
          last_reviewed: string
          model: string
          notes: string | null
          region_variant_warning: boolean
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          brand: string
          created_at?: string
          family?: string | null
          id?: string
          last_reviewed?: string
          model: string
          notes?: string | null
          region_variant_warning?: boolean
          status: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          aliases?: string[]
          brand?: string
          created_at?: string
          family?: string | null
          id?: string
          last_reviewed?: string
          model?: string
          notes?: string | null
          region_variant_warning?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          data_type: string
          fair_use_note: string | null
          fair_use_policy: string | null
          high_speed_allowance: string | null
          network_operators: string[]
          package_kind: string
          product_id: string
          provider_bundle_id: string | null
          provider_metadata: Json
          raw_validity_unit: string | null
          raw_validity_value: number | null
          region_id: string | null
          speed_after_fair_use: string | null
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
          data_type?: string
          fair_use_note?: string | null
          fair_use_policy?: string | null
          high_speed_allowance?: string | null
          network_operators?: string[]
          package_kind?: string
          product_id: string
          provider_bundle_id?: string | null
          provider_metadata?: Json
          raw_validity_unit?: string | null
          raw_validity_value?: number | null
          region_id?: string | null
          speed_after_fair_use?: string | null
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
          data_type?: string
          fair_use_note?: string | null
          fair_use_policy?: string | null
          high_speed_allowance?: string | null
          network_operators?: string[]
          package_kind?: string
          product_id?: string
          provider_bundle_id?: string | null
          provider_metadata?: Json
          raw_validity_unit?: string | null
          raw_validity_value?: number | null
          region_id?: string | null
          speed_after_fair_use?: string | null
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
      esim_usage_settings: {
        Row: {
          config: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          captured_at: string
          id: string
          quote_currency: string
          rate: number
        }
        Insert: {
          base_currency: string
          captured_at?: string
          id?: string
          quote_currency: string
          rate: number
        }
        Update: {
          base_currency?: string
          captured_at?: string
          id?: string
          quote_currency?: string
          rate?: number
        }
        Relationships: []
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
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          key: string
          response: Json | null
          scope: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          key: string
          response?: Json | null
          scope: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          key?: string
          response?: Json | null
          scope?: string
          status?: string
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
      media_assets: {
        Row: {
          alt_text: string
          category: string
          created_at: string
          created_by: string | null
          focal_x: number
          focal_y: number
          height: number | null
          id: string
          label: string
          mime_type: string | null
          public_url: string
          size_bytes: number | null
          storage_path: string
          tags: string[]
          updated_at: string
          usage: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          category?: string
          created_at?: string
          created_by?: string | null
          focal_x?: number
          focal_y?: number
          height?: number | null
          id?: string
          label: string
          mime_type?: string | null
          public_url: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          updated_at?: string
          usage?: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          category?: string
          created_at?: string
          created_by?: string | null
          focal_x?: number
          focal_y?: number
          height?: number | null
          id?: string
          label?: string
          mime_type?: string | null
          public_url?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          updated_at?: string
          usage?: string
          width?: number | null
        }
        Relationships: []
      }
      ops_alerts: {
        Row: {
          context: Json
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          context?: Json
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          context?: Json
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          airport_iata_snapshot: string | null
          created_at: string
          currency: string
          destination_snapshot: string | null
          details_snapshot: Json
          discount: number
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          product_slug_snapshot: string | null
          provider_cost: number
          provider_id: string | null
          provider_reference: string | null
          quantity: number
          sale_price: number
          service_type: Database["public"]["Enums"]["service_type"]
          traveler_id: string | null
        }
        Insert: {
          airport_iata_snapshot?: string | null
          created_at?: string
          currency?: string
          destination_snapshot?: string | null
          details_snapshot?: Json
          discount?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          product_slug_snapshot?: string | null
          provider_cost?: number
          provider_id?: string | null
          provider_reference?: string | null
          quantity?: number
          sale_price?: number
          service_type: Database["public"]["Enums"]["service_type"]
          traveler_id?: string | null
        }
        Update: {
          airport_iata_snapshot?: string | null
          created_at?: string
          currency?: string
          destination_snapshot?: string | null
          details_snapshot?: Json
          discount?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          product_slug_snapshot?: string | null
          provider_cost?: number
          provider_id?: string | null
          provider_reference?: string | null
          quantity?: number
          sale_price?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          traveler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "travelers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_country_iso: string | null
          customer_id: string | null
          discount_total: number
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          fx_rate_to_eur: number | null
          gross_revenue: number
          guest_claim_token: string | null
          guest_email: string | null
          id: string
          idempotency_key: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          order_number: string
          payment_fee: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          provider_cost_total: number
          refunded_total: number
          status: Database["public"]["Enums"]["order_status"]
          tax_total: number
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_country_iso?: string | null
          customer_id?: string | null
          discount_total?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          fx_rate_to_eur?: number | null
          gross_revenue?: number
          guest_claim_token?: string | null
          guest_email?: string | null
          id?: string
          idempotency_key?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          order_number: string
          payment_fee?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          provider_cost_total?: number
          refunded_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          tax_total?: number
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_country_iso?: string | null
          customer_id?: string | null
          discount_total?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          fx_rate_to_eur?: number | null
          gross_revenue?: number
          guest_claim_token?: string | null
          guest_email?: string | null
          id?: string
          idempotency_key?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          order_number?: string
          payment_fee?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          provider_cost_total?: number
          refunded_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          tax_total?: number
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "customer_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          fee: number
          id: string
          kind: string
          order_id: string
          payout_reference: string | null
          psp: string | null
          psp_transaction_id: string | null
          raw: Json
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          kind?: string
          order_id: string
          payout_reference?: string | null
          psp?: string | null
          psp_transaction_id?: string | null
          raw?: Json
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          kind?: string
          order_id?: string
          payout_reference?: string | null
          psp?: string | null
          psp_transaction_id?: string | null
          raw?: Json
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      provider_catalogue_changes: {
        Row: {
          change_type: string
          created_at: string
          details: Json
          external_id: string
          id: string
          needs_review: boolean
          product_id: string | null
          provider_id: string
          reviewed_at: string | null
          sync_run_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          details?: Json
          external_id: string
          id?: string
          needs_review?: boolean
          product_id?: string | null
          provider_id: string
          reviewed_at?: string | null
          sync_run_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          details?: Json
          external_id?: string
          id?: string
          needs_review?: boolean
          product_id?: string | null
          provider_id?: string
          reviewed_at?: string | null
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_catalogue_changes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_catalogue_changes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_catalogue_changes_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "provider_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_connections: {
        Row: {
          base_url: string | null
          config: Json
          created_at: string
          credential_secret_names: string[]
          environment: string
          id: string
          last_attempt_at: string | null
          last_checked_at: string | null
          last_success_at: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          provider_id: string
          rate_limit_per_minute: number | null
          status: string
          sync_cron: string | null
          sync_state: string
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
          last_attempt_at?: string | null
          last_checked_at?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider_id: string
          rate_limit_per_minute?: number | null
          status?: string
          sync_cron?: string | null
          sync_state?: string
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
          last_attempt_at?: string | null
          last_checked_at?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider_id?: string
          rate_limit_per_minute?: number | null
          status?: string
          sync_cron?: string | null
          sync_state?: string
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
      provider_price_history: {
        Row: {
          change_amount: number | null
          change_percent: number | null
          created_at: string
          currency: string
          external_id: string
          id: string
          new_cost: number
          old_cost: number | null
          product_id: string | null
          provider_id: string
          sync_run_id: string | null
        }
        Insert: {
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string
          currency?: string
          external_id: string
          id?: string
          new_cost: number
          old_cost?: number | null
          product_id?: string | null
          provider_id: string
          sync_run_id?: string | null
        }
        Update: {
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          new_cost?: number
          old_cost?: number | null
          product_id?: string | null
          provider_id?: string
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_price_history_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_price_history_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "provider_sync_runs"
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
          checkpoint_page: number
          complete: boolean
          completed_at: string | null
          connection_id: string | null
          coverage_changes: number
          error_summary: string | null
          id: string
          idempotency_key: string | null
          items_created: number
          items_failed: number
          items_processed: number
          items_received: number
          items_returned: number
          items_unavailable: number
          items_unchanged: number
          items_updated: number
          last_checkpoint_at: string | null
          price_changes: number
          provider_id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          trigger: Database["public"]["Enums"]["sync_trigger"]
        }
        Insert: {
          checkpoint_page?: number
          complete?: boolean
          completed_at?: string | null
          connection_id?: string | null
          coverage_changes?: number
          error_summary?: string | null
          id?: string
          idempotency_key?: string | null
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_received?: number
          items_returned?: number
          items_unavailable?: number
          items_unchanged?: number
          items_updated?: number
          last_checkpoint_at?: string | null
          price_changes?: number
          provider_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          trigger?: Database["public"]["Enums"]["sync_trigger"]
        }
        Update: {
          checkpoint_page?: number
          complete?: boolean
          completed_at?: string | null
          connection_id?: string | null
          coverage_changes?: number
          error_summary?: string | null
          id?: string
          idempotency_key?: string | null
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_received?: number
          items_returned?: number
          items_unavailable?: number
          items_unchanged?: number
          items_updated?: number
          last_checkpoint_at?: string | null
          price_changes?: number
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
          adapter_type: string
          auto_sync: boolean
          balance_amount: number | null
          balance_checked_at: string | null
          balance_currency: string | null
          capabilities: Database["public"]["Enums"]["provider_capability"][]
          code: string
          created_at: string
          currency: string
          id: string
          low_balance_threshold: number | null
          minimum_margin_percent: number | null
          name: string
          notes: string | null
          priority: number
          service_type: Database["public"]["Enums"]["service_type"]
          sync_interval_hours: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          adapter_type?: string
          auto_sync?: boolean
          balance_amount?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          capabilities?: Database["public"]["Enums"]["provider_capability"][]
          code: string
          created_at?: string
          currency?: string
          id?: string
          low_balance_threshold?: number | null
          minimum_margin_percent?: number | null
          name: string
          notes?: string | null
          priority?: number
          service_type: Database["public"]["Enums"]["service_type"]
          sync_interval_hours?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          adapter_type?: string
          auto_sync?: boolean
          balance_amount?: number | null
          balance_checked_at?: string | null
          balance_currency?: string | null
          capabilities?: Database["public"]["Enums"]["provider_capability"][]
          code?: string
          created_at?: string
          currency?: string
          id?: string
          low_balance_threshold?: number | null
          minimum_margin_percent?: number | null
          name?: string
          notes?: string | null
          priority?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          sync_interval_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          amount: number | null
          audit: Json
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          id: string
          order_id: string
          order_item_id: string | null
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
        }
        Insert: {
          amount?: number | null
          audit?: Json
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Update: {
          amount?: number | null
          audit?: Json
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
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
      route_presets: {
        Row: {
          active: boolean
          content: Json
          countries: string[]
          created_at: string
          featured: boolean
          icon: string
          id: string
          media_id: string | null
          mobile_media_id: string | null
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          content?: Json
          countries?: string[]
          created_at?: string
          featured?: boolean
          icon?: string
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          content?: Json
          countries?: string[]
          created_at?: string
          featured?: boolean
          icon?: string
          id?: string
          media_id?: string | null
          mobile_media_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_presets_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_presets_mobile_media_id_fkey"
            columns: ["mobile_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
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
          is_test: boolean
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
          source: string
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
          is_test?: boolean
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
          source?: string
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
          is_test?: boolean
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
          source?: string
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
      theme_settings: {
        Row: {
          draft: Json
          id: string
          published: Json
          published_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          draft?: Json
          id: string
          published?: Json
          published_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          draft?: Json
          id?: string
          published?: Json
          published_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      traffic_attribution: {
        Row: {
          captured_at: string
          customer_id: string | null
          first_touch_source: Database["public"]["Enums"]["attribution_source"]
          id: string
          landing_path: string | null
          last_touch_source: Database["public"]["Enums"]["attribution_source"]
          order_id: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          captured_at?: string
          customer_id?: string | null
          first_touch_source?: Database["public"]["Enums"]["attribution_source"]
          id?: string
          landing_path?: string | null
          last_touch_source?: Database["public"]["Enums"]["attribution_source"]
          order_id?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          captured_at?: string
          customer_id?: string | null
          first_touch_source?: Database["public"]["Enums"]["attribution_source"]
          id?: string
          landing_path?: string | null
          last_touch_source?: Database["public"]["Enums"]["attribution_source"]
          order_id?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_attribution_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      travelers: {
        Row: {
          birth_date: string | null
          created_at: string
          customer_id: string
          full_name: string | null
          id: string
          label: string
          relation: Database["public"]["Enums"]["traveler_relation"]
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          customer_id: string
          full_name?: string | null
          id?: string
          label: string
          relation?: Database["public"]["Enums"]["traveler_relation"]
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          customer_id?: string
          full_name?: string | null
          id?: string
          label?: string
          relation?: Database["public"]["Enums"]["traveler_relation"]
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
      accept_admin_invitation: { Args: never; Returns: Json }
      cancel_admin_invitation: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_admin: {
        Args: { _email: string; _note: string; _token_hash: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      list_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed: boolean
          full_name: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      log_admin_action: {
        Args: {
          _action: string
          _after: Json
          _before: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: string
      }
      refresh_admin_invitation: {
        Args: { _id: string; _token_hash: string }
        Returns: undefined
      }
      revoke_admin: { Args: { _user_id: string }; Returns: undefined }
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
      sync_status:
        | "PENDING"
        | "RUNNING"
        | "SUCCESS"
        | "PARTIAL"
        | "FAILED"
        | "CANCELLED"
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
      sync_status: [
        "PENDING",
        "RUNNING",
        "SUCCESS",
        "PARTIAL",
        "FAILED",
        "CANCELLED",
      ],
      sync_trigger: ["SCHEDULED", "MANUAL", "WEBHOOK"],
      traveler_relation: ["SELF", "PARTNER", "CHILD", "OTHER"],
    },
  },
} as const
