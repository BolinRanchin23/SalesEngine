// Simplified Database types for Supabase client
// Can be regenerated with `supabase gen types typescript`

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          airtable_id: string | null;
          name: string;
          industry: string | null;
          employee_count_range: string | null;
          revenue_range: string | null;
          website: string | null;
          phone: string | null;
          fax: string | null;
          hq_address: string | null;
          description: string | null;
          linkedin_url: string | null;
          enrichment_status: string;
          source: string | null;
          last_enriched_at: string | null;
          founded_year: number | null;
          annual_revenue: number | null;
          logo_url: string | null;
          technologies: string[] | null;
          keywords: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          airtable_id?: string | null;
          name: string;
          industry?: string | null;
          employee_count_range?: string | null;
          revenue_range?: string | null;
          website?: string | null;
          phone?: string | null;
          fax?: string | null;
          hq_address?: string | null;
          description?: string | null;
          linkedin_url?: string | null;
          enrichment_status?: string;
          source?: string | null;
          last_enriched_at?: string | null;
          founded_year?: number | null;
          annual_revenue?: number | null;
          logo_url?: string | null;
          technologies?: string[] | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          airtable_id?: string | null;
          name?: string;
          industry?: string | null;
          employee_count_range?: string | null;
          revenue_range?: string | null;
          website?: string | null;
          phone?: string | null;
          fax?: string | null;
          hq_address?: string | null;
          description?: string | null;
          linkedin_url?: string | null;
          enrichment_status?: string;
          source?: string | null;
          last_enriched_at?: string | null;
          founded_year?: number | null;
          annual_revenue?: number | null;
          logo_url?: string | null;
          technologies?: string[] | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          airtable_id: string | null;
          company_id: string | null;
          first_name: string;
          last_name: string;
          title: string | null;
          email: string | null;
          email_verified: boolean;
          work_phone: string | null;
          cell_phone: string | null;
          linkedin_url: string | null;
          bio: string | null;
          headshot_url: string | null;
          work_address: string | null;
          home_address: string | null;
          delivery_address: string | null;
          notes: string | null;
          relationship_notes: string | null;
          is_current_client: boolean;
          is_out_of_industry: boolean;
          source: string | null;
          enrichment_status: string;
          assigned_to: string | null;
          email_status: string | null;
          email_verified_at: string | null;
          last_enriched_at: string | null;
          work_history: Record<string, unknown>[] | null;
          education: Record<string, unknown>[] | null;
          skills: string[] | null;
          certifications: string[] | null;
          languages: Record<string, unknown>[] | null;
          seniority: string | null;
          department: string | null;
          pdl_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          airtable_id?: string | null;
          company_id?: string | null;
          first_name: string;
          last_name: string;
          title?: string | null;
          email?: string | null;
          email_verified?: boolean;
          work_phone?: string | null;
          cell_phone?: string | null;
          linkedin_url?: string | null;
          bio?: string | null;
          headshot_url?: string | null;
          work_address?: string | null;
          home_address?: string | null;
          delivery_address?: string | null;
          notes?: string | null;
          relationship_notes?: string | null;
          is_current_client?: boolean;
          is_out_of_industry?: boolean;
          source?: string | null;
          enrichment_status?: string;
          assigned_to?: string | null;
          email_status?: string | null;
          email_verified_at?: string | null;
          last_enriched_at?: string | null;
          work_history?: Record<string, unknown>[] | null;
          education?: Record<string, unknown>[] | null;
          skills?: string[] | null;
          certifications?: string[] | null;
          languages?: Record<string, unknown>[] | null;
          seniority?: string | null;
          department?: string | null;
          pdl_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          airtable_id?: string | null;
          company_id?: string | null;
          first_name?: string;
          last_name?: string;
          title?: string | null;
          email?: string | null;
          email_verified?: boolean;
          work_phone?: string | null;
          cell_phone?: string | null;
          linkedin_url?: string | null;
          bio?: string | null;
          headshot_url?: string | null;
          work_address?: string | null;
          home_address?: string | null;
          delivery_address?: string | null;
          notes?: string | null;
          relationship_notes?: string | null;
          is_current_client?: boolean;
          is_out_of_industry?: boolean;
          source?: string | null;
          enrichment_status?: string;
          assigned_to?: string | null;
          email_status?: string | null;
          email_verified_at?: string | null;
          last_enriched_at?: string | null;
          work_history?: Record<string, unknown>[] | null;
          education?: Record<string, unknown>[] | null;
          skills?: string[] | null;
          certifications?: string[] | null;
          languages?: Record<string, unknown>[] | null;
          seniority?: string | null;
          department?: string | null;
          pdl_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          id: string;
          airtable_id: string | null;
          company_id: string | null;
          name: string;
          address: string | null;
          square_footage: string | null;
          current_csf: string | null;
          property_manager: string | null;
          engineers: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          airtable_id?: string | null;
          company_id?: string | null;
          name: string;
          address?: string | null;
          square_footage?: string | null;
          current_csf?: string | null;
          property_manager?: string | null;
          engineers?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          airtable_id?: string | null;
          company_id?: string | null;
          name?: string;
          address?: string | null;
          square_footage?: string | null;
          current_csf?: string | null;
          property_manager?: string | null;
          engineers?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      verticals: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      icp_profiles: {
        Row: {
          id: string;
          vertical_id: string;
          name: string | null;
          target_titles: string[] | null;
          target_company_sizes: string[] | null;
          target_geographies: string[] | null;
          target_industries: string[] | null;
          title_weight: number;
          company_weight: number;
          geo_weight: number;
          industry_weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          name?: string | null;
          target_titles?: string[] | null;
          target_company_sizes?: string[] | null;
          target_geographies?: string[] | null;
          target_industries?: string[] | null;
          title_weight?: number;
          company_weight?: number;
          geo_weight?: number;
          industry_weight?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          name?: string | null;
          target_titles?: string[] | null;
          target_company_sizes?: string[] | null;
          target_geographies?: string[] | null;
          target_industries?: string[] | null;
          title_weight?: number;
          company_weight?: number;
          geo_weight?: number;
          industry_weight?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "icp_profiles_vertical_id_fkey";
            columns: ["vertical_id"];
            isOneToOne: false;
            referencedRelation: "verticals";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_scores: {
        Row: {
          id: string;
          contact_id: string;
          vertical_id: string;
          fit_score: number | null;
          confidence_score: number | null;
          relevance_score: number | null;
          composite_score: number | null;
          score_details: Record<string, unknown> | null;
          scored_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          vertical_id: string;
          fit_score?: number | null;
          confidence_score?: number | null;
          relevance_score?: number | null;
          composite_score?: number | null;
          score_details?: Record<string, unknown> | null;
          scored_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          vertical_id?: string;
          fit_score?: number | null;
          confidence_score?: number | null;
          relevance_score?: number | null;
          composite_score?: number | null;
          score_details?: Record<string, unknown> | null;
          scored_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_scores_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_scores_vertical_id_fkey";
            columns: ["vertical_id"];
            isOneToOne: false;
            referencedRelation: "verticals";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          id: string;
          vertical_id: string;
          name: string;
          position: number;
          color: string | null;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          name: string;
          position: number;
          color?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          name?: string;
          position?: number;
          color?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_vertical_id_fkey";
            columns: ["vertical_id"];
            isOneToOne: false;
            referencedRelation: "verticals";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_pipeline: {
        Row: {
          id: string;
          contact_id: string;
          pipeline_stage_id: string;
          vertical_id: string;
          moved_at: string;
          moved_by: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          pipeline_stage_id: string;
          vertical_id: string;
          moved_at?: string;
          moved_by?: string | null;
        };
        Update: {
          id?: string;
          contact_id?: string;
          pipeline_stage_id?: string;
          vertical_id?: string;
          moved_at?: string;
          moved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_pipeline_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_pipeline_pipeline_stage_id_fkey";
            columns: ["pipeline_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_pipeline_vertical_id_fkey";
            columns: ["vertical_id"];
            isOneToOne: false;
            referencedRelation: "verticals";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          airtable_id: string | null;
          contact_id: string | null;
          type: string;
          notes: string | null;
          activity_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          airtable_id?: string | null;
          contact_id?: string | null;
          type: string;
          notes?: string | null;
          activity_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          airtable_id?: string | null;
          contact_id?: string | null;
          type?: string;
          notes?: string | null;
          activity_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      enrichment_logs: {
        Row: {
          id: string;
          contact_id: string | null;
          company_id: string | null;
          provider: string;
          request_type: string | null;
          request_payload: Record<string, unknown> | null;
          response_payload: Record<string, unknown> | null;
          status: string | null;
          credits_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          company_id?: string | null;
          provider: string;
          request_type?: string | null;
          request_payload?: Record<string, unknown> | null;
          response_payload?: Record<string, unknown> | null;
          status?: string | null;
          credits_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string | null;
          company_id?: string | null;
          provider?: string;
          request_type?: string | null;
          request_payload?: Record<string, unknown> | null;
          response_payload?: Record<string, unknown> | null;
          status?: string | null;
          credits_used?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrichment_logs_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrichment_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string | null;
        };
        Relationships: [];
      };
      contact_tags: {
        Row: {
          contact_id: string;
          tag_id: string;
        };
        Insert: {
          contact_id: string;
          tag_id: string;
        };
        Update: {
          contact_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      suppression_list: {
        Row: {
          id: string;
          email: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_relationships: {
        Row: {
          id: string;
          contact_id: string;
          related_contact_id: string;
          relationship_type: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          related_contact_id: string;
          relationship_type?: string | null;
        };
        Update: {
          id?: string;
          contact_id?: string;
          related_contact_id?: string;
          relationship_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_relationships_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_relationships_related_contact_id_fkey";
            columns: ["related_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      enrichment_queue: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          provider: string;
          operation: string;
          priority: number;
          status: string;
          attempts: number;
          max_attempts: number;
          last_error: string | null;
          scheduled_after: string;
          locked_at: string | null;
          locked_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          provider: string;
          operation: string;
          priority?: number;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          last_error?: string | null;
          scheduled_after?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          provider?: string;
          operation?: string;
          priority?: number;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          last_error?: string | null;
          scheduled_after?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      enrichment_credit_budgets: {
        Row: {
          id: string;
          provider: string;
          period: string;
          period_start: string;
          budget_limit: number;
          credits_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          period: string;
          period_start: string;
          budget_limit: number;
          credits_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          period?: string;
          period_start?: string;
          budget_limit?: number;
          credits_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      enrichment_cache: {
        Row: {
          id: string;
          cache_key: string;
          provider: string;
          operation: string;
          request_params: Record<string, unknown>;
          response_data: Record<string, unknown>;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          provider: string;
          operation: string;
          request_params: Record<string, unknown>;
          response_data: Record<string, unknown>;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          provider?: string;
          operation?: string;
          request_params?: Record<string, unknown>;
          response_data?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      enrichment_field_provenance: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          field_name: string;
          provider: string;
          value: string | null;
          confidence: number | null;
          enriched_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          field_name: string;
          provider: string;
          value?: string | null;
          confidence?: number | null;
          enriched_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          field_name?: string;
          provider?: string;
          value?: string | null;
          confidence?: number | null;
          enriched_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_credit_usage: {
        Args: {
          p_provider: string;
          p_period: string;
          p_period_start: string;
          p_amount?: number;
        };
        Returns: { new_credits_used: number; budget_limit: number }[];
      };
      reset_expired_credit_budgets: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Vertical = Database["public"]["Tables"]["verticals"]["Row"];
export type IcpProfile = Database["public"]["Tables"]["icp_profiles"]["Row"];
export type ContactScore = Database["public"]["Tables"]["contact_scores"]["Row"];
export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type ContactPipeline = Database["public"]["Tables"]["contact_pipeline"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type EnrichmentLog = Database["public"]["Tables"]["enrichment_logs"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
export type SuppressionEntry = Database["public"]["Tables"]["suppression_list"]["Row"];
export type ContactRelationship = Database["public"]["Tables"]["contact_relationships"]["Row"];
export type EnrichmentQueueItem = Database["public"]["Tables"]["enrichment_queue"]["Row"];
export type EnrichmentCreditBudget = Database["public"]["Tables"]["enrichment_credit_budgets"]["Row"];
export type EnrichmentCache = Database["public"]["Tables"]["enrichment_cache"]["Row"];
export type EnrichmentFieldProvenance = Database["public"]["Tables"]["enrichment_field_provenance"]["Row"];
