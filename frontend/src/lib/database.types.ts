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
      assistant_audit_events: {
        Row: {
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"]
          completion_status: string
          correlation_id: string
          created_at: string
          error_code: string | null
          id: number
          latency_ms: number
          policy_outcome: string
          retention_until: string | null
          safe_parameters: Json
          source_ids: string[]
          tool_names: string[]
          usage_metadata: Json
        }
        Insert: {
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"]
          completion_status: string
          correlation_id: string
          created_at?: string
          error_code?: string | null
          id?: never
          latency_ms?: number
          policy_outcome: string
          retention_until?: string | null
          safe_parameters?: Json
          source_ids?: string[]
          tool_names?: string[]
          usage_metadata?: Json
        }
        Update: {
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["app_role"]
          completion_status?: string
          correlation_id?: string
          created_at?: string
          error_code?: string | null
          id?: never
          latency_ms?: number
          policy_outcome?: string
          retention_until?: string | null
          safe_parameters?: Json
          source_ids?: string[]
          tool_names?: string[]
          usage_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assistant_audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          location: Json
          search_vector: unknown
          version_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          location?: Json
          search_vector?: unknown
          version_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          location?: Json
          search_vector?: unknown
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "assistant_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_document_chunks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assistant_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_document_versions: {
        Row: {
          checksum_sha256: string
          created_at: string
          document_id: string
          extraction_metadata: Json
          id: string
          version: number
        }
        Insert: {
          checksum_sha256: string
          created_at?: string
          document_id: string
          extraction_metadata?: Json
          id?: string
          version: number
        }
        Update: {
          checksum_sha256?: string
          created_at?: string
          document_id?: string
          extraction_metadata?: Json
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assistant_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "assistant_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_documents: {
        Row: {
          archived_at: string | null
          checksum_sha256: string
          created_at: string
          created_by: string
          id: string
          mime_type: string
          retention_until: string | null
          size_bytes: number
          source_file_name: string
          status: Database["public"]["Enums"]["assistant_document_status"]
          storage_path: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["assistant_document_visibility"]
          visible_branch_ids: string[]
          visible_roles: Database["public"]["Enums"]["app_role"][]
          visible_user_ids: string[]
        }
        Insert: {
          archived_at?: string | null
          checksum_sha256: string
          created_at?: string
          created_by: string
          id?: string
          mime_type: string
          retention_until?: string | null
          size_bytes: number
          source_file_name: string
          status?: Database["public"]["Enums"]["assistant_document_status"]
          storage_path: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["assistant_document_visibility"]
          visible_branch_ids?: string[]
          visible_roles?: Database["public"]["Enums"]["app_role"][]
          visible_user_ids?: string[]
        }
        Update: {
          archived_at?: string | null
          checksum_sha256?: string
          created_at?: string
          created_by?: string
          id?: string
          mime_type?: string
          retention_until?: string | null
          size_bytes?: number
          source_file_name?: string
          status?: Database["public"]["Enums"]["assistant_document_status"]
          storage_path?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["assistant_document_visibility"]
          visible_branch_ids?: string[]
          visible_roles?: Database["public"]["Enums"]["app_role"][]
          visible_user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "assistant_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_logs: {
        Row: {
          created_at: string
          error_code: string | null
          id: number
          intent: string
          latency_ms: number
          manager_id: string
          parameters: Json
          result_count: number
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: never
          intent: string
          latency_ms?: number
          manager_id: string
          parameters?: Json
          result_count?: number
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: never
          intent?: string
          latency_ms?: number
          manager_id?: string
          parameters?: Json
          result_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "assistant_logs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          actor_id: string
          body: string
          citations: Json
          correlation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["assistant_message_role"]
          status: Database["public"]["Enums"]["assistant_message_status"]
          thread_id: string
        }
        Insert: {
          actor_id: string
          body: string
          citations?: Json
          correlation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["assistant_message_role"]
          status?: Database["public"]["Enums"]["assistant_message_status"]
          thread_id: string
        }
        Update: {
          actor_id?: string
          body?: string
          citations?: Json
          correlation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["assistant_message_role"]
          status?: Database["public"]["Enums"]["assistant_message_status"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          retention_until: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          retention_until?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          retention_until?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_threads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string
          after_values: Json
          before_values: Json
          created_at: string
          id: number
          order_id: string
        }
        Insert: {
          action: string
          actor_id: string
          after_values?: Json
          before_values?: Json
          created_at?: string
          id?: never
          order_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          after_values?: Json
          before_values?: Json
          created_at?: string
          id?: never
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          name: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          audience_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          created_by: string
          direct_key: string | null
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          order_id: string | null
          title: string
        }
        Insert: {
          audience_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          created_by: string
          direct_key?: string | null
          id?: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          order_id?: string | null
          title: string
        }
        Update: {
          audience_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          created_by?: string
          direct_key?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          order_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_evidence: {
        Row: {
          checklist_item_id: string | null
          committed: boolean
          created_at: string
          file_name: string
          id: string
          media_kind: Database["public"]["Enums"]["evidence_kind"]
          mime_type: string
          order_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Insert: {
          checklist_item_id?: string | null
          committed?: boolean
          created_at?: string
          file_name: string
          id?: string
          media_kind: Database["public"]["Enums"]["evidence_kind"]
          mime_type: string
          order_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Update: {
          checklist_item_id?: string | null
          committed?: boolean
          created_at?: string
          file_name?: string
          id?: string
          media_kind?: Database["public"]["Enums"]["evidence_kind"]
          mime_type?: string
          order_id?: string
          size_bytes?: number
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_evidence_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_checklist"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "job_evidence_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "order_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "job_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_evidence_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          mentions: string[]
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          mentions?: string[]
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          mentions?: string[]
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          activated_at: string | null
          body: string
          category: string
          created_at: string
          dedupe_key: string | null
          href: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          order_id: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          recipient_id: string | null
          recipient_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          activated_at?: string | null
          body: string
          category?: string
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          order_id?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          activated_at?: string | null
          body?: string
          category?: string
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          order_id?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          position: number
          required: boolean
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          position: number
          required?: boolean
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          position?: number
          required?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        Insert: {
          address: string
          admin_notes?: string | null
          assigned_technician_id?: string | null
          branch_id: string
          created_at?: string
          created_by: string
          customer_name: string
          customer_phone: string
          id?: string
          order_no?: string
          problem_description: string
          quoted_price: number
          scheduled_at?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          address?: string
          admin_notes?: string | null
          assigned_technician_id?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          order_no?: string
          problem_description?: string
          quoted_price?: number
          scheduled_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string
          receipt_evidence_id: string | null
          received_at: string
          recorded_by: string
        }
        Insert: {
          amount: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id: string
          receipt_evidence_id?: string | null
          received_at?: string
          recorded_by: string
        }
        Update: {
          amount?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string
          receipt_evidence_id?: string | null
          received_at?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_evidence_id_fkey"
            columns: ["receipt_evidence_id"]
            isOneToOne: false
            referencedRelation: "job_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          display_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          display_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          notes: string | null
          order_id: string
          outcome: Database["public"]["Enums"]["review_outcome"]
          reviewed_at: string
          reviewer_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          order_id: string
          outcome: Database["public"]["Enums"]["review_outcome"]
          reviewed_at?: string
          reviewer_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          order_id?: string
          outcome?: Database["public"]["Enums"]["review_outcome"]
          reviewed_at?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          new_scheduled_at: string
          order_id: string
          previous_scheduled_at: string | null
          reason: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          new_scheduled_at: string
          order_id: string
          previous_scheduled_at?: string | null
          reason: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          new_scheduled_at?: string
          order_id?: string
          previous_scheduled_at?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "schedule_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_checklist_templates: {
        Row: {
          id: string
          position: number
          required: boolean
          service_type: Database["public"]["Enums"]["service_type"]
          title: string
        }
        Insert: {
          id?: string
          position: number
          required?: boolean
          service_type: Database["public"]["Enums"]["service_type"]
          title: string
        }
        Update: {
          id?: string
          position?: number
          required?: boolean
          service_type?: Database["public"]["Enums"]["service_type"]
          title?: string
        }
        Relationships: []
      }
      service_completions: {
        Row: {
          completed_at: string
          extra_charges: number
          final_amount: number
          id: string
          order_id: string
          remarks: string | null
          technician_id: string
          work_done: string
        }
        Insert: {
          completed_at?: string
          extra_charges?: number
          final_amount: number
          id?: string
          order_id: string
          remarks?: string | null
          technician_id: string
          work_done: string
        }
        Update: {
          completed_at?: string
          extra_charges?: number
          final_amount?: number
          id?: string
          order_id?: string
          remarks?: string | null
          technician_id?: string
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_completions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assistant_analytics_checklist: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          item_id: string | null
          order_id: string | null
          order_no: string | null
          required: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_analytics_completions: {
        Row: {
          completed_at: string | null
          completion_id: string | null
          extra_charges: number | null
          final_amount: number | null
          order_id: string | null
          order_no: string | null
          technician_id: string | null
          technician_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_completions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_analytics_orders: {
        Row: {
          assigned_technician_id: string | null
          branch_name: string | null
          created_at: string | null
          customer_name: string | null
          order_id: string | null
          order_no: string | null
          quoted_price: number | null
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          technician_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_analytics_payments: {
        Row: {
          amount: number | null
          assigned_technician_id: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          order_id: string | null
          order_no: string | null
          payment_id: string | null
          received_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_analytics_reviews: {
        Row: {
          order_id: string | null
          order_no: string | null
          outcome: Database["public"]["Enums"]["review_outcome"] | null
          review_id: string | null
          reviewed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_analytics_schedule_events: {
        Row: {
          assigned_technician_id: string | null
          created_at: string | null
          event_id: string | null
          new_scheduled_at: string | null
          order_id: string | null
          order_no: string | null
          previous_scheduled_at: string | null
          reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "assistant_analytics_orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "schedule_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_order: {
        Args: {
          p_expected_version: number
          p_order_id: string
          p_technician_id: string
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assistant_order_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      can_access_assistant_document: {
        Args: { target_document: string }
        Returns: boolean
      }
      can_access_order: { Args: { target_order: string }; Returns: boolean }
      cleanup_expired_assistant_data: {
        Args: never
        Returns: {
          anonymized_audits: number
          deleted_threads: number
        }[]
      }
      close_order: {
        Args: { p_expected_version: number; p_order_id: string }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_order: {
        Args: {
          p_expected_version: number
          p_extra_charges: number
          p_order_id: string
          p_payment_amount?: number
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_remarks?: string
          p_work_done: string
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order: {
        Args: {
          p_address: string
          p_admin_notes?: string
          p_assigned_technician_id?: string
          p_branch_id: string
          p_customer_name: string
          p_customer_phone: string
          p_problem_description: string
          p_quoted_price: number
          p_scheduled_at?: string
          p_service_type: Database["public"]["Enums"]["service_type"]
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      dashboard_metrics: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      execute_assistant_analytical_query: {
        Args: {
          p_max_rows?: number
          p_sql: string
          p_statement_timeout_ms?: number
        }
        Returns: Json
      }
      is_conversation_member: { Args: { target: string }; Returns: boolean }
      record_payment: {
        Args: {
          p_amount: number
          p_expected_version: number
          p_method: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_order_id: string
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_whatsapp_feedback_opened: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      reopen_checklist_items: {
        Args: { p_item_ids: string[]; p_order_id: string }
        Returns: undefined
      }
      replace_order_checklist: {
        Args: {
          p_expected_version: number
          p_order_id: string
          p_titles: string[]
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reschedule_order: {
        Args: {
          p_expected_version: number
          p_new_time: string
          p_order_id: string
          p_reason: string
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_order: {
        Args: {
          p_expected_version: number
          p_notes?: string
          p_order_id: string
          p_outcome: Database["public"]["Enums"]["review_outcome"]
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_authorized_document_chunks: {
        Args: { p_limit?: number; p_query: string; p_query_embedding?: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          document_title: string
          location: Json
          retrieved_at: string
          score: number
        }[]
      }
      staff_directory: {
        Args: never
        Returns: {
          branch_id: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      start_order: {
        Args: { p_expected_version: number; p_order_id: string }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      technician_completions: {
        Args: { p_from: string; p_technician: string; p_to: string }
        Returns: {
          completed_at: string
          order_no: string
          service_type: Database["public"]["Enums"]["service_type"]
        }[]
      }
      update_checklist_item: {
        Args: {
          p_completed: boolean
          p_expected_version: number
          p_item_id: string
          p_note?: string
          p_order_id: string
        }
        Returns: {
          address: string
          admin_notes: string | null
          assigned_technician_id: string | null
          branch_id: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          problem_description: string
          quoted_price: number
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_assistant_audit_event: {
        Args: {
          p_actor_role: Database["public"]["Enums"]["app_role"]
          p_completion_status: string
          p_correlation_id: string
          p_error_code?: string
          p_latency_ms: number
          p_policy_outcome: string
          p_source_ids: string[]
          p_tool_names: string[]
        }
        Returns: undefined
      }
      write_assistant_query_audit_event: {
        Args: {
          p_actor_role: Database["public"]["Enums"]["app_role"]
          p_completion_status: string
          p_correlation_id: string
          p_error_code?: string
          p_latency_ms: number
          p_policy_outcome: string
          p_safe_parameters?: Json
          p_source_ids: string[]
          p_tool_names: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "technician" | "manager"
      assistant_document_status:
        | "pending"
        | "processing"
        | "ready"
        | "failed"
        | "quarantined"
        | "archived"
      assistant_document_visibility: "all_authenticated" | "restricted"
      assistant_message_role: "user" | "assistant"
      assistant_message_status: "pending" | "completed" | "refused" | "failed"
      conversation_kind: "order" | "direct" | "announcement"
      evidence_kind: "image" | "video" | "pdf" | "receipt"
      notification_kind:
        | "assignment"
        | "job_done"
        | "correction_required"
        | "customer_feedback"
      notification_priority: "normal" | "high"
      order_status:
        | "New"
        | "Assigned"
        | "In Progress"
        | "Job Done"
        | "Reviewed"
        | "Closed"
      payment_method: "Cash" | "Card" | "Bank Transfer" | "E-Wallet"
      review_outcome: "accepted" | "returned"
      service_type:
        | "Cleaning"
        | "Repair"
        | "Installation"
        | "Gas Refill"
        | "Inspection"
        | "Other"
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
    Enums: {
      app_role: ["admin", "technician", "manager"],
      assistant_document_status: [
        "pending",
        "processing",
        "ready",
        "failed",
        "quarantined",
        "archived",
      ],
      assistant_document_visibility: ["all_authenticated", "restricted"],
      assistant_message_role: ["user", "assistant"],
      assistant_message_status: ["pending", "completed", "refused", "failed"],
      conversation_kind: ["order", "direct", "announcement"],
      evidence_kind: ["image", "video", "pdf", "receipt"],
      notification_kind: [
        "assignment",
        "job_done",
        "correction_required",
        "customer_feedback",
      ],
      notification_priority: ["normal", "high"],
      order_status: [
        "New",
        "Assigned",
        "In Progress",
        "Job Done",
        "Reviewed",
        "Closed",
      ],
      payment_method: ["Cash", "Card", "Bank Transfer", "E-Wallet"],
      review_outcome: ["accepted", "returned"],
      service_type: [
        "Cleaning",
        "Repair",
        "Installation",
        "Gas Refill",
        "Inspection",
        "Other",
      ],
    },
  },
} as const

