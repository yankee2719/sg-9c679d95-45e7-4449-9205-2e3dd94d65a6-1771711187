 
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      checklist_execution_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          execution_id: string
          flag_reason: string | null
          flagged: boolean | null
          id: string
          notes: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          execution_id: string
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          notes?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          execution_id?: string
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          notes?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_execution_items_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "checklist_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_execution_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "checklist_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_executions: {
        Row: {
          approved: boolean | null
          checklist_template_id: string
          completed_at: string | null
          created_at: string | null
          digital_signature: string | null
          id: string
          items_data: Json
          maintenance_log_id: string | null
          notes: string | null
          review_notes: string | null
          reviewed_by: string | null
          schedule_id: string | null
          signature_name: string | null
          started_at: string | null
          status: string | null
          technician_id: string
          template_id: string | null
          total_duration: number | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          checklist_template_id: string
          completed_at?: string | null
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          items_data: Json
          maintenance_log_id?: string | null
          notes?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          signature_name?: string | null
          started_at?: string | null
          status?: string | null
          technician_id: string
          template_id?: string | null
          total_duration?: number | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          checklist_template_id?: string
          completed_at?: string | null
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          items_data?: Json
          maintenance_log_id?: string | null
          notes?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          signature_name?: string | null
          started_at?: string | null
          status?: string | null
          technician_id?: string
          template_id?: string | null
          total_duration?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_executions_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_executions_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          item_type: Database["public"]["Enums"]["checklist_item_type"] | null
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          item_type?: Database["public"]["Enums"]["checklist_item_type"] | null
          order_index: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          item_type?: Database["public"]["Enums"]["checklist_item_type"] | null
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          required: boolean
          task_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          required?: boolean
          task_order: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          required?: boolean
          task_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          equipment: string | null
          equipment_category_id: string | null
          estimated_time: number | null
          id: string
          is_active: boolean | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          equipment_category_id?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          equipment_category_id?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_equipment_category_id_fkey"
            columns: ["equipment_category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          equipment_id: string | null
          file_type: string | null
          file_url: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          installation_date: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          qr_code: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          technical_specs: Json | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          installation_date?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          technical_specs?: Json | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          installation_date?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          technical_specs?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_documents: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          document_type: string
          equipment_id: string
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          document_type: string
          equipment_id: string
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          equipment_id?: string
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_specifications: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          spec_key: string
          spec_value: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          spec_key: string
          spec_value: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          spec_key?: string
          spec_value?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_specifications_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_videos: {
        Row: {
          description: string | null
          duration: number | null
          equipment_id: string | null
          id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          uploaded_at: string | null
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          description?: string | null
          duration?: number | null
          equipment_id?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          description?: string | null
          duration?: number | null
          equipment_id?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_videos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklist_responses: {
        Row: {
          checklist_item_id: string
          id: string
          is_completed: boolean | null
          maintenance_record_id: string
          notes: string | null
          photo_urls: string[] | null
          responded_at: string | null
          responded_by: string | null
          response_value: string | null
        }
        Insert: {
          checklist_item_id: string
          id?: string
          is_completed?: boolean | null
          maintenance_record_id: string
          notes?: string | null
          photo_urls?: string[] | null
          responded_at?: string | null
          responded_by?: string | null
          response_value?: string | null
        }
        Update: {
          checklist_item_id?: string
          id?: string
          is_completed?: boolean | null
          maintenance_record_id?: string
          notes?: string | null
          photo_urls?: string[] | null
          responded_at?: string | null
          responded_by?: string | null
          response_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_checklist_responses_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_checklist_responses_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          equipment_id: string
          id: string
          issues_found: string | null
          notes: string | null
          parts_replaced: string[] | null
          photo_urls: string[] | null
          schedule_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["maintenance_status"] | null
          technician_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          equipment_id: string
          id?: string
          issues_found?: string | null
          notes?: string | null
          parts_replaced?: string[] | null
          photo_urls?: string[] | null
          schedule_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          technician_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          equipment_id?: string
          id?: string
          issues_found?: string | null
          notes?: string | null
          parts_replaced?: string[] | null
          photo_urls?: string[] | null
          schedule_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          technician_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_photos: {
        Row: {
          caption: string | null
          id: string
          maintenance_record_id: string
          photo_url: string
          taken_at: string | null
          taken_by: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          maintenance_record_id: string
          photo_url: string
          taken_at?: string | null
          taken_by?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          maintenance_record_id?: string
          photo_url?: string
          taken_at?: string | null
          taken_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_photos_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          assigned_to: string | null
          checklist_template_id: string | null
          created_at: string | null
          created_by: string | null
          custom_frequency_days: number | null
          equipment_id: string
          estimated_duration: number | null
          frequency: string
          id: string
          is_active: boolean | null
          last_completed_date: string | null
          maintenance_type: string
          next_due_date: string
          notes: string | null
          plan_name: string
          priority: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_frequency_days?: number | null
          equipment_id: string
          estimated_duration?: number | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          maintenance_type: string
          next_due_date: string
          notes?: string | null
          plan_name: string
          priority?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          checklist_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_frequency_days?: number | null
          equipment_id?: string
          estimated_duration?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          maintenance_type?: string
          next_due_date?: string
          notes?: string | null
          plan_name?: string
          priority?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          actions_taken: string | null
          assigned_to: string | null
          checklist_template_id: string | null
          completed_at: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          equipment_id: string
          id: string
          issues_found: string | null
          maintenance_plan_id: string | null
          maintenance_type: string
          notes: string | null
          parts_used: Json | null
          performed_by: string | null
          priority: string | null
          reviewed_by: string | null
          scheduled_date: string | null
          signature_data: string | null
          started_at: string | null
          status: string
          time_spent_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actions_taken?: string | null
          assigned_to?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment_id: string
          id?: string
          issues_found?: string | null
          maintenance_plan_id?: string | null
          maintenance_type: string
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          priority?: string | null
          reviewed_by?: string | null
          scheduled_date?: string | null
          signature_data?: string | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actions_taken?: string | null
          assigned_to?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment_id?: string
          id?: string
          issues_found?: string | null
          maintenance_plan_id?: string | null
          maintenance_type?: string
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          priority?: string | null
          reviewed_by?: string | null
          scheduled_date?: string | null
          signature_data?: string | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedule_checklists: {
        Row: {
          created_at: string | null
          execution_order: number | null
          id: string
          is_required: boolean | null
          schedule_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          execution_order?: number | null
          id?: string
          is_required?: boolean | null
          schedule_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          execution_order?: number | null
          id?: string
          is_required?: boolean | null
          schedule_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_checklists_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          assigned_to: string | null
          checklist_template_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          equipment_id: string
          estimated_duration_minutes: number | null
          frequency_days: number | null
          id: string
          is_active: boolean
          maintenance_type: Database["public"]["Enums"]["maintenance_type_enum"]
          priority: Database["public"]["Enums"]["maintenance_priority"] | null
          recurrence_pattern: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["maintenance_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          equipment_id: string
          estimated_duration_minutes?: number | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean
          maintenance_type?: Database["public"]["Enums"]["maintenance_type_enum"]
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          recurrence_pattern?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          checklist_template_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          equipment_id?: string
          estimated_duration_minutes?: number | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean
          maintenance_type?: Database["public"]["Enums"]["maintenance_type_enum"]
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          recurrence_pattern?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          secret: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          secret: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          secret?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_tutorials: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          equipment_id: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          equipment_id?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          equipment_id?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tutorials_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_maintenance_user: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_role: string
        }
        Returns: Json
      }
      ensure_user_profile: {
        Args: { user_email: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      checklist_item_type: "required" | "optional"
      equipment_status:
        | "active"
        | "under_maintenance"
        | "inactive"
        | "decommissioned"
      maintenance_priority: "low" | "medium" | "high" | "critical"
      maintenance_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "overdue"
        | "cancelled"
      maintenance_type_enum:
        | "preventive"
        | "corrective"
        | "predictive"
        | "extraordinary"
      user_role: "admin" | "supervisor" | "technician"
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
      checklist_item_type: ["required", "optional"],
      equipment_status: [
        "active",
        "under_maintenance",
        "inactive",
        "decommissioned",
      ],
      maintenance_priority: ["low", "medium", "high", "critical"],
      maintenance_status: [
        "scheduled",
        "in_progress",
        "completed",
        "overdue",
        "cancelled",
      ],
      maintenance_type_enum: [
        "preventive",
        "corrective",
        "predictive",
        "extraordinary",
      ],
      user_role: ["admin", "supervisor", "technician"],
    },
  },
} as const
