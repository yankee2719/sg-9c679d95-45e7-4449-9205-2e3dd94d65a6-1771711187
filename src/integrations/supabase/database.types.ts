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
            audit_logs: {
                Row: {
                    action: string
                    actor_user_id: string | null
                    context_id: string | null
                    context_type: string | null
                    created_at: string
                    document_id: string | null
                    entity_id: string
                    entity_type: string
                    id: string
                    machine_id: string | null
                    metadata: Json
                    new_data: Json | null
                    old_data: Json | null
                    organization_id: string
                }
                Insert: {
                    action: string
                    actor_user_id?: string | null
                    context_id?: string | null
                    context_type?: string | null
                    created_at?: string
                    document_id?: string | null
                    entity_id: string
                    entity_type: string
                    id?: string
                    machine_id?: string | null
                    metadata?: Json
                    new_data?: Json | null
                    old_data?: Json | null
                    organization_id: string
                }
                Update: {
                    action?: string
                    actor_user_id?: string | null
                    context_id?: string | null
                    context_type?: string | null
                    created_at?: string
                    document_id?: string | null
                    entity_id?: string
                    entity_type?: string
                    id?: string
                    machine_id?: string | null
                    metadata?: Json
                    new_data?: Json | null
                    old_data?: Json | null
                    organization_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "audit_logs_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "audit_logs_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
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
            checklist_assignments: {
                Row: {
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    machine_id: string | null
                    organization_id: string
                    production_line_id: string | null
                    template_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    machine_id?: string | null
                    organization_id: string
                    production_line_id?: string | null
                    template_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    machine_id?: string | null
                    organization_id?: string
                    production_line_id?: string | null
                    template_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_assignments_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_assignments_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_assignments_production_line_id_fkey"
                        columns: ["production_line_id"]
                        isOneToOne: false
                        referencedRelation: "production_lines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_assignments_template_id_fkey"
                        columns: ["template_id"]
                        isOneToOne: false
                        referencedRelation: "checklist_templates"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklist_execution_items: {
                Row: {
                    created_at: string | null
                    execution_id: string
                    id: string
                    notes: string | null
                    template_item_id: string
                    value: string | null
                }
                Insert: {
                    created_at?: string | null
                    execution_id: string
                    id?: string
                    notes?: string | null
                    template_item_id: string
                    value?: string | null
                }
                Update: {
                    created_at?: string | null
                    execution_id?: string
                    id?: string
                    notes?: string | null
                    template_item_id?: string
                    value?: string | null
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
                        foreignKeyName: "checklist_execution_items_template_item_id_fkey"
                        columns: ["template_item_id"]
                        isOneToOne: false
                        referencedRelation: "checklist_template_items"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklist_execution_photos: {
                Row: {
                    created_at: string | null
                    execution_item_id: string
                    id: string
                    storage_path: string
                }
                Insert: {
                    created_at?: string | null
                    execution_item_id: string
                    id?: string
                    storage_path: string
                }
                Update: {
                    created_at?: string | null
                    execution_item_id?: string
                    id?: string
                    storage_path?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_execution_photos_execution_item_id_fkey"
                        columns: ["execution_item_id"]
                        isOneToOne: false
                        referencedRelation: "checklist_execution_items"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklist_executions: {
                Row: {
                    assignment_id: string
                    checklist_id: string | null
                    completed_at: string | null
                    created_at: string
                    executed_at: string
                    executed_by: string
                    id: string
                    machine_id: string | null
                    notes: string | null
                    organization_id: string
                    overall_status: string | null
                    template_version: number
                    work_order_id: string | null
                }
                Insert: {
                    assignment_id: string
                    checklist_id?: string | null
                    completed_at?: string | null
                    created_at?: string
                    executed_at?: string
                    executed_by: string
                    id?: string
                    machine_id?: string | null
                    notes?: string | null
                    organization_id: string
                    overall_status?: string | null
                    template_version?: number
                    work_order_id?: string | null
                }
                Update: {
                    assignment_id?: string
                    checklist_id?: string | null
                    completed_at?: string | null
                    created_at?: string
                    executed_at?: string
                    executed_by?: string
                    id?: string
                    machine_id?: string | null
                    notes?: string | null
                    organization_id?: string
                    overall_status?: string | null
                    template_version?: number
                    work_order_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_executions_assignment_id_fkey"
                        columns: ["assignment_id"]
                        isOneToOne: false
                        referencedRelation: "checklist_assignments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_executions_checklist_id_fkey"
                        columns: ["checklist_id"]
                        isOneToOne: false
                        referencedRelation: "checklists"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_executions_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_executions_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_executions_work_order_id_fkey"
                        columns: ["work_order_id"]
                        isOneToOne: false
                        referencedRelation: "work_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklist_items: {
                Row: {
                    checklist_id: string
                    created_at: string
                    description: string | null
                    expected_value: string | null
                    id: string
                    is_required: boolean
                    item_order: number
                    max_value: number | null
                    measurement_unit: string | null
                    min_value: number | null
                    title: string
                }
                Insert: {
                    checklist_id: string
                    created_at?: string
                    description?: string | null
                    expected_value?: string | null
                    id?: string
                    is_required?: boolean
                    item_order?: number
                    max_value?: number | null
                    measurement_unit?: string | null
                    min_value?: number | null
                    title: string
                }
                Update: {
                    checklist_id?: string
                    created_at?: string
                    description?: string | null
                    expected_value?: string | null
                    id?: string
                    is_required?: boolean
                    item_order?: number
                    max_value?: number | null
                    measurement_unit?: string | null
                    min_value?: number | null
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_items_checklist_id_fkey"
                        columns: ["checklist_id"]
                        isOneToOne: false
                        referencedRelation: "checklists"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklist_template_items: {
                Row: {
                    created_at: string
                    description: string | null
                    id: string
                    input_type: string
                    is_required: boolean
                    metadata: Json | null
                    order_index: number
                    organization_id: string
                    template_id: string
                    title: string
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    id: string
                    input_type: string
                    is_required?: boolean
                    metadata?: Json | null
                    order_index?: number
                    organization_id: string
                    template_id: string
                    title: string
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    input_type?: string
                    is_required?: boolean
                    metadata?: Json | null
                    order_index?: number
                    organization_id?: string
                    template_id?: string
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_template_items_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklist_template_items_template_id_fkey"
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
                    created_at: string
                    description: string | null
                    equipment_type: string | null
                    id: string
                    is_active: boolean
                    name: string
                    organization_id: string
                    target_type: string
                    version: number
                }
                Insert: {
                    category?: string | null
                    created_at?: string
                    description?: string | null
                    equipment_type?: string | null
                    id?: string
                    is_active?: boolean
                    name: string
                    organization_id: string
                    target_type: string
                    version?: number
                }
                Update: {
                    category?: string | null
                    created_at?: string
                    description?: string | null
                    equipment_type?: string | null
                    id?: string
                    is_active?: boolean
                    name?: string
                    organization_id?: string
                    target_type?: string
                    version?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "checklist_templates_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checklists: {
                Row: {
                    checklist_type: string | null
                    created_at: string
                    created_by: string | null
                    description: string | null
                    id: string
                    is_active: boolean
                    is_template: boolean
                    machine_id: string | null
                    organization_id: string
                    title: string
                    updated_at: string
                }
                Insert: {
                    checklist_type?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean
                    is_template?: boolean
                    machine_id?: string | null
                    organization_id: string
                    title: string
                    updated_at?: string
                }
                Update: {
                    checklist_type?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean
                    is_template?: boolean
                    machine_id?: string | null
                    organization_id?: string
                    title?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "checklists_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checklists_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            customer_hidden_machines: {
                Row: {
                    created_at: string
                    customer_org_id: string
                    hidden_at: string
                    hidden_by: string | null
                    id: string
                    machine_id: string
                    reason: string | null
                }
                Insert: {
                    created_at?: string
                    customer_org_id: string
                    hidden_at?: string
                    hidden_by?: string | null
                    id?: string
                    machine_id: string
                    reason?: string | null
                }
                Update: {
                    created_at?: string
                    customer_org_id?: string
                    hidden_at?: string
                    hidden_by?: string | null
                    id?: string
                    machine_id?: string
                    reason?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "customer_hidden_machines_customer_org_id_fkey"
                        columns: ["customer_org_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "customer_hidden_machines_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                ]
            }
            document_audit_logs: {
                Row: {
                    action: string
                    actor_id: string | null
                    created_at: string
                    document_id: string
                    id: string
                    ip_address: unknown
                    metadata: Json | null
                    user_agent: string | null
                    version_id: string | null
                }
                Insert: {
                    action: string
                    actor_id?: string | null
                    created_at?: string
                    document_id: string
                    id?: string
                    ip_address?: unknown
                    metadata?: Json | null
                    user_agent?: string | null
                    version_id?: string | null
                }
                Update: {
                    action?: string
                    actor_id?: string | null
                    created_at?: string
                    document_id?: string
                    id?: string
                    ip_address?: unknown
                    metadata?: Json | null
                    user_agent?: string | null
                    version_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "document_audit_logs_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "document_audit_logs_version_id_fkey"
                        columns: ["version_id"]
                        isOneToOne: false
                        referencedRelation: "document_versions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            document_versions: {
                Row: {
                    change_summary: string | null
                    checksum_sha256: string
                    created_at: string
                    created_by: string
                    document_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    id: string
                    mime_type: string
                    previous_version_id: string | null
                    signature_data: Json | null
                    signed_at: string | null
                    signed_by: string | null
                    version_number: number
                }
                Insert: {
                    change_summary?: string | null
                    checksum_sha256: string
                    created_at?: string
                    created_by: string
                    document_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    id?: string
                    mime_type: string
                    previous_version_id?: string | null
                    signature_data?: Json | null
                    signed_at?: string | null
                    signed_by?: string | null
                    version_number: number
                }
                Update: {
                    change_summary?: string | null
                    checksum_sha256?: string
                    created_at?: string
                    created_by?: string
                    document_id?: string
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    id?: string
                    mime_type?: string
                    previous_version_id?: string | null
                    signature_data?: Json | null
                    signed_at?: string | null
                    signed_by?: string | null
                    version_number?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "document_versions_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "document_versions_previous_version_id_fkey"
                        columns: ["previous_version_id"]
                        isOneToOne: false
                        referencedRelation: "document_versions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            documents: {
                Row: {
                    archived_at: string | null
                    category: Database["public"]["Enums"]["document_category"]
                    created_at: string
                    created_by: string | null
                    current_version_id: string | null
                    description: string | null
                    external_url: string | null
                    file_size: number | null
                    id: string
                    is_archived: boolean
                    is_mandatory: boolean
                    language: string | null
                    machine_id: string | null
                    mime_type: string | null
                    organization_id: string
                    plant_id: string | null
                    regulatory_reference: string | null
                    storage_bucket: string | null
                    storage_path: string | null
                    tags: string[] | null
                    title: string
                    updated_at: string
                    version_count: number
                }
                Insert: {
                    archived_at?: string | null
                    category?: Database["public"]["Enums"]["document_category"]
                    created_at?: string
                    created_by?: string | null
                    current_version_id?: string | null
                    description?: string | null
                    external_url?: string | null
                    file_size?: number | null
                    id?: string
                    is_archived?: boolean
                    is_mandatory?: boolean
                    language?: string | null
                    machine_id?: string | null
                    mime_type?: string | null
                    organization_id: string
                    plant_id?: string | null
                    regulatory_reference?: string | null
                    storage_bucket?: string | null
                    storage_path?: string | null
                    tags?: string[] | null
                    title: string
                    updated_at?: string
                    version_count?: number
                }
                Update: {
                    archived_at?: string | null
                    category?: Database["public"]["Enums"]["document_category"]
                    created_at?: string
                    created_by?: string | null
                    current_version_id?: string | null
                    description?: string | null
                    external_url?: string | null
                    file_size?: number | null
                    id?: string
                    is_archived?: boolean
                    is_mandatory?: boolean
                    language?: string | null
                    machine_id?: string | null
                    mime_type?: string | null
                    organization_id?: string
                    plant_id?: string | null
                    regulatory_reference?: string | null
                    storage_bucket?: string | null
                    storage_path?: string | null
                    tags?: string[] | null
                    title?: string
                    updated_at?: string
                    version_count?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "documents_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "documents_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "documents_plant_id_fkey"
                        columns: ["plant_id"]
                        isOneToOne: false
                        referencedRelation: "plants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "fk_documents_current_version"
                        columns: ["current_version_id"]
                        isOneToOne: false
                        referencedRelation: "document_versions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            machine_assignments: {
                Row: {
                    assigned_at: string | null
                    assigned_by: string | null
                    created_at: string | null
                    customer_org_id: string
                    id: string
                    is_active: boolean | null
                    machine_id: string
                    manufacturer_org_id: string
                    notes: string | null
                    revoked_at: string | null
                    revoked_by: string | null
                }
                Insert: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    created_at?: string | null
                    customer_org_id: string
                    id?: string
                    is_active?: boolean | null
                    machine_id: string
                    manufacturer_org_id?: string
                    notes?: string | null
                    revoked_at?: string | null
                    revoked_by?: string | null
                }
                Update: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    created_at?: string | null
                    customer_org_id?: string
                    id?: string
                    is_active?: boolean | null
                    machine_id?: string
                    manufacturer_org_id?: string
                    notes?: string | null
                    revoked_at?: string | null
                    revoked_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "machine_assignments_customer_org_id_fkey"
                        columns: ["customer_org_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machine_assignments_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machine_assignments_manufacturer_org_id_fkey"
                        columns: ["manufacturer_org_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            machine_events: {
                Row: {
                    actor_id: string | null
                    actor_type: Database["public"]["Enums"]["event_actor_type"]
                    created_at: string
                    event_type: string
                    event_version: number
                    hash: string
                    id: string
                    machine_id: string
                    organization_id: string
                    payload: Json
                    previous_hash: string | null
                    sequence_number: number
                }
                Insert: {
                    actor_id?: string | null
                    actor_type?: Database["public"]["Enums"]["event_actor_type"]
                    created_at?: string
                    event_type: string
                    event_version?: number
                    hash: string
                    id?: string
                    machine_id: string
                    organization_id: string
                    payload?: Json
                    previous_hash?: string | null
                    sequence_number: number
                }
                Update: {
                    actor_id?: string | null
                    actor_type?: Database["public"]["Enums"]["event_actor_type"]
                    created_at?: string
                    event_type?: string
                    event_version?: number
                    hash?: string
                    id?: string
                    machine_id?: string
                    organization_id?: string
                    payload?: Json
                    previous_hash?: string | null
                    sequence_number?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "machine_events_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machine_events_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            machines: {
                Row: {
                    archived_at: string | null
                    archived_by: string | null
                    area: string | null
                    brand: string | null
                    category: string | null
                    commissioned_at: string | null
                    created_at: string
                    created_by: string | null
                    decommissioned_at: string | null
                    deleted_at: string | null
                    deleted_by: string | null
                    id: string
                    internal_code: string | null
                    is_archived: boolean
                    is_deleted: boolean
                    lifecycle_state: string
                    manufacturer_id: string | null
                    model: string | null
                    name: string
                    notes: string | null
                    organization_id: string
                    photo_url: string | null
                    plant_id: string | null
                    position: string | null
                    production_line_id: string | null
                    qr_code_generated_at: string | null
                    qr_code_token: string | null
                    serial_number: string | null
                    specifications: Json | null
                    subcategory: string | null
                    tags: string[] | null
                    updated_at: string
                    year_of_manufacture: number | null
                }
                Insert: {
                    archived_at?: string | null
                    archived_by?: string | null
                    area?: string | null
                    brand?: string | null
                    category?: string | null
                    commissioned_at?: string | null
                    created_at?: string
                    created_by?: string | null
                    decommissioned_at?: string | null
                    deleted_at?: string | null
                    deleted_by?: string | null
                    id?: string
                    internal_code?: string | null
                    is_archived?: boolean
                    is_deleted?: boolean
                    lifecycle_state?: string
                    manufacturer_id?: string | null
                    model?: string | null
                    name: string
                    notes?: string | null
                    organization_id: string
                    photo_url?: string | null
                    plant_id?: string | null
                    position?: string | null
                    production_line_id?: string | null
                    qr_code_generated_at?: string | null
                    qr_code_token?: string | null
                    serial_number?: string | null
                    specifications?: Json | null
                    subcategory?: string | null
                    tags?: string[] | null
                    updated_at?: string
                    year_of_manufacture?: number | null
                }
                Update: {
                    archived_at?: string | null
                    archived_by?: string | null
                    area?: string | null
                    brand?: string | null
                    category?: string | null
                    commissioned_at?: string | null
                    created_at?: string
                    created_by?: string | null
                    decommissioned_at?: string | null
                    deleted_at?: string | null
                    deleted_by?: string | null
                    id?: string
                    internal_code?: string | null
                    is_archived?: boolean
                    is_deleted?: boolean
                    lifecycle_state?: string
                    manufacturer_id?: string | null
                    model?: string | null
                    name?: string
                    notes?: string | null
                    organization_id?: string
                    photo_url?: string | null
                    plant_id?: string | null
                    position?: string | null
                    production_line_id?: string | null
                    qr_code_generated_at?: string | null
                    qr_code_token?: string | null
                    serial_number?: string | null
                    specifications?: Json | null
                    subcategory?: string | null
                    tags?: string[] | null
                    updated_at?: string
                    year_of_manufacture?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_machines_manufacturer"
                        columns: ["manufacturer_id"]
                        isOneToOne: false
                        referencedRelation: "manufacturers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machines_manufacturer_id_fkey"
                        columns: ["manufacturer_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machines_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machines_plant_id_fkey"
                        columns: ["plant_id"]
                        isOneToOne: false
                        referencedRelation: "plants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "machines_production_line_id_fkey"
                        columns: ["production_line_id"]
                        isOneToOne: false
                        referencedRelation: "production_lines"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_plan_checklists: {
                Row: {
                    created_at: string
                    execution_order: number
                    id: string
                    is_required: boolean
                    plan_id: string
                    template_id: string
                }
                Insert: {
                    created_at?: string
                    execution_order?: number
                    id?: string
                    is_required?: boolean
                    plan_id: string
                    template_id: string
                }
                Update: {
                    created_at?: string
                    execution_order?: number
                    id?: string
                    is_required?: boolean
                    plan_id?: string
                    template_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_plan_checklists_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "maintenance_plans"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "maintenance_plan_checklists_template_id_fkey"
                        columns: ["template_id"]
                        isOneToOne: false
                        referencedRelation: "checklist_templates"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_plans: {
                Row: {
                    created_at: string
                    created_by: string | null
                    default_assignee_id: string | null
                    description: string | null
                    estimated_duration_minutes: number | null
                    frequency_type: string
                    frequency_value: number
                    id: string
                    instructions: string | null
                    is_active: boolean
                    last_executed_at: string | null
                    machine_id: string | null
                    next_due_date: string | null
                    organization_id: string
                    priority: Database["public"]["Enums"]["work_order_priority"]
                    required_skills: string[] | null
                    safety_notes: string | null
                    spare_parts: Json | null
                    title: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    created_by?: string | null
                    default_assignee_id?: string | null
                    description?: string | null
                    estimated_duration_minutes?: number | null
                    frequency_type: string
                    frequency_value: number
                    id?: string
                    instructions?: string | null
                    is_active?: boolean
                    last_executed_at?: string | null
                    machine_id?: string | null
                    next_due_date?: string | null
                    organization_id: string
                    priority?: Database["public"]["Enums"]["work_order_priority"]
                    required_skills?: string[] | null
                    safety_notes?: string | null
                    spare_parts?: Json | null
                    title: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    created_by?: string | null
                    default_assignee_id?: string | null
                    description?: string | null
                    estimated_duration_minutes?: number | null
                    frequency_type?: string
                    frequency_value?: number
                    id?: string
                    instructions?: string | null
                    is_active?: boolean
                    last_executed_at?: string | null
                    machine_id?: string | null
                    next_due_date?: string | null
                    organization_id?: string
                    priority?: Database["public"]["Enums"]["work_order_priority"]
                    required_skills?: string[] | null
                    safety_notes?: string | null
                    spare_parts?: Json | null
                    title?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_plans_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "maintenance_plans_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            manufacturers: {
                Row: {
                    address: string | null
                    country: string | null
                    created_at: string | null
                    created_by: string | null
                    email: string | null
                    id: string
                    is_archived: boolean | null
                    name: string
                    notes: string | null
                    organization_id: string | null
                    phone: string | null
                    updated_at: string | null
                    website: string | null
                }
                Insert: {
                    address?: string | null
                    country?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    email?: string | null
                    id?: string
                    is_archived?: boolean | null
                    name: string
                    notes?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    updated_at?: string | null
                    website?: string | null
                }
                Update: {
                    address?: string | null
                    country?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    email?: string | null
                    id?: string
                    is_archived?: boolean | null
                    name?: string
                    notes?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    updated_at?: string | null
                    website?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "manufacturers_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notifications: {
                Row: {
                    created_at: string
                    id: string
                    is_read: boolean
                    message: string | null
                    organization_id: string | null
                    read_at: string | null
                    reference_id: string | null
                    reference_type: string | null
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    is_read?: boolean
                    message?: string | null
                    organization_id?: string | null
                    read_at?: string | null
                    reference_id?: string | null
                    reference_type?: string | null
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    is_read?: boolean
                    message?: string | null
                    organization_id?: string | null
                    read_at?: string | null
                    reference_id?: string | null
                    reference_type?: string | null
                    title?: string
                    type?: Database["public"]["Enums"]["notification_type"]
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organization_memberships: {
                Row: {
                    accepted_at: string | null
                    created_at: string
                    deactivated_at: string | null
                    deactivated_by: string | null
                    id: string
                    invited_at: string | null
                    invited_by: string | null
                    is_active: boolean
                    organization_id: string
                    role: Database["public"]["Enums"]["org_role"]
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    accepted_at?: string | null
                    created_at?: string
                    deactivated_at?: string | null
                    deactivated_by?: string | null
                    id?: string
                    invited_at?: string | null
                    invited_by?: string | null
                    is_active?: boolean
                    organization_id: string
                    role?: Database["public"]["Enums"]["org_role"]
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    accepted_at?: string | null
                    created_at?: string
                    deactivated_at?: string | null
                    deactivated_by?: string | null
                    id?: string
                    invited_at?: string | null
                    invited_by?: string | null
                    is_active?: boolean
                    organization_id?: string
                    role?: Database["public"]["Enums"]["org_role"]
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "organization_memberships_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organizations: {
                Row: {
                    address_line1: string | null
                    address_line2: string | null
                    archived_at: string | null
                    city: string | null
                    country: string | null
                    created_at: string
                    created_by: string | null
                    current_period_end: string | null
                    deleted_at: string | null
                    deleted_by: string | null
                    email: string | null
                    fiscal_code: string | null
                    id: string
                    is_archived: boolean
                    is_deleted: boolean
                    logo_url: string | null
                    manufacturer_org_id: string | null
                    max_equipment: number | null
                    max_machines: number | null
                    max_plants: number | null
                    max_users: number | null
                    name: string
                    phone: string | null
                    postal_code: string | null
                    province: string | null
                    settings: Json | null
                    slug: string
                    stripe_customer_id: string | null
                    stripe_subscription_id: string | null
                    subscription_period: string | null
                    subscription_plan: string | null
                    subscription_status: string | null
                    trial_ends_at: string | null
                    type: Database["public"]["Enums"]["org_type"]
                    updated_at: string
                    vat_number: string | null
                    website: string | null
                }
                Insert: {
                    address_line1?: string | null
                    address_line2?: string | null
                    archived_at?: string | null
                    city?: string | null
                    country?: string | null
                    created_at?: string
                    created_by?: string | null
                    current_period_end?: string | null
                    deleted_at?: string | null
                    deleted_by?: string | null
                    email?: string | null
                    fiscal_code?: string | null
                    id?: string
                    is_archived?: boolean
                    is_deleted?: boolean
                    logo_url?: string | null
                    manufacturer_org_id?: string | null
                    max_equipment?: number | null
                    max_machines?: number | null
                    max_plants?: number | null
                    max_users?: number | null
                    name: string
                    phone?: string | null
                    postal_code?: string | null
                    province?: string | null
                    settings?: Json | null
                    slug: string
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_period?: string | null
                    subscription_plan?: string | null
                    subscription_status?: string | null
                    trial_ends_at?: string | null
                    type?: Database["public"]["Enums"]["org_type"]
                    updated_at?: string
                    vat_number?: string | null
                    website?: string | null
                }
                Update: {
                    address_line1?: string | null
                    address_line2?: string | null
                    archived_at?: string | null
                    city?: string | null
                    country?: string | null
                    created_at?: string
                    created_by?: string | null
                    current_period_end?: string | null
                    deleted_at?: string | null
                    deleted_by?: string | null
                    email?: string | null
                    fiscal_code?: string | null
                    id?: string
                    is_archived?: boolean
                    is_deleted?: boolean
                    logo_url?: string | null
                    manufacturer_org_id?: string | null
                    max_equipment?: number | null
                    max_machines?: number | null
                    max_plants?: number | null
                    max_users?: number | null
                    name?: string
                    phone?: string | null
                    postal_code?: string | null
                    province?: string | null
                    settings?: Json | null
                    slug?: string
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    subscription_period?: string | null
                    subscription_plan?: string | null
                    subscription_status?: string | null
                    trial_ends_at?: string | null
                    type?: Database["public"]["Enums"]["org_type"]
                    updated_at?: string
                    vat_number?: string | null
                    website?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "organizations_manufacturer_org_id_fkey"
                        columns: ["manufacturer_org_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            plant_assignments: {
                Row: {
                    assigned_at: string
                    assigned_by: string | null
                    id: string
                    plant_id: string
                    user_id: string
                }
                Insert: {
                    assigned_at?: string
                    assigned_by?: string | null
                    id?: string
                    plant_id: string
                    user_id: string
                }
                Update: {
                    assigned_at?: string
                    assigned_by?: string | null
                    id?: string
                    plant_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "plant_assignments_plant_id_fkey"
                        columns: ["plant_id"]
                        isOneToOne: false
                        referencedRelation: "plants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            plants: {
                Row: {
                    address_line1: string | null
                    address_line2: string | null
                    archived_at: string | null
                    city: string | null
                    code: string | null
                    country: string | null
                    created_at: string
                    created_by: string | null
                    description: string | null
                    id: string
                    is_archived: boolean
                    latitude: number | null
                    longitude: number | null
                    name: string
                    organization_id: string
                    plant_manager_email: string | null
                    plant_manager_name: string | null
                    plant_manager_phone: string | null
                    plant_type: string
                    postal_code: string | null
                    province: string | null
                    settings: Json | null
                    updated_at: string
                }
                Insert: {
                    address_line1?: string | null
                    address_line2?: string | null
                    archived_at?: string | null
                    city?: string | null
                    code?: string | null
                    country?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_archived?: boolean
                    latitude?: number | null
                    longitude?: number | null
                    name: string
                    organization_id: string
                    plant_manager_email?: string | null
                    plant_manager_name?: string | null
                    plant_manager_phone?: string | null
                    plant_type?: string
                    postal_code?: string | null
                    province?: string | null
                    settings?: Json | null
                    updated_at?: string
                }
                Update: {
                    address_line1?: string | null
                    address_line2?: string | null
                    archived_at?: string | null
                    city?: string | null
                    code?: string | null
                    country?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_archived?: boolean
                    latitude?: number | null
                    longitude?: number | null
                    name?: string
                    organization_id?: string
                    plant_manager_email?: string | null
                    plant_manager_name?: string | null
                    plant_manager_phone?: string | null
                    plant_type?: string
                    postal_code?: string | null
                    province?: string | null
                    settings?: Json | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "plants_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            platform_admins: {
                Row: {
                    granted_at: string
                    granted_by: string | null
                    id: string
                    is_active: boolean
                    notes: string | null
                    user_id: string
                }
                Insert: {
                    granted_at?: string
                    granted_by?: string | null
                    id?: string
                    is_active?: boolean
                    notes?: string | null
                    user_id: string
                }
                Update: {
                    granted_at?: string
                    granted_by?: string | null
                    id?: string
                    is_active?: boolean
                    notes?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            production_lines: {
                Row: {
                    code: string | null
                    created_at: string | null
                    created_by: string | null
                    description: string | null
                    id: string
                    is_archived: boolean | null
                    name: string
                    organization_id: string
                    plant_id: string
                    updated_at: string | null
                }
                Insert: {
                    code?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_archived?: boolean | null
                    name: string
                    organization_id: string
                    plant_id: string
                    updated_at?: string | null
                }
                Update: {
                    code?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    is_archived?: boolean | null
                    name?: string
                    organization_id?: string
                    plant_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "production_lines_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "production_lines_plant_id_fkey"
                        columns: ["plant_id"]
                        isOneToOne: false
                        referencedRelation: "plants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    default_organization_id: string | null
                    display_name: string | null
                    email: string | null
                    first_name: string | null
                    id: string
                    language: string | null
                    last_name: string | null
                    last_sign_in_at: string | null
                    phone: string | null
                    timezone: string | null
                    updated_at: string
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    default_organization_id?: string | null
                    display_name?: string | null
                    email?: string | null
                    first_name?: string | null
                    id: string
                    language?: string | null
                    last_name?: string | null
                    last_sign_in_at?: string | null
                    phone?: string | null
                    timezone?: string | null
                    updated_at?: string
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    default_organization_id?: string | null
                    display_name?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    language?: string | null
                    last_name?: string | null
                    last_sign_in_at?: string | null
                    phone?: string | null
                    timezone?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_default_organization_id_fkey"
                        columns: ["default_organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            work_orders: {
                Row: {
                    actual_duration_minutes: number | null
                    assigned_to: string | null
                    completed_at: string | null
                    completed_by: string | null
                    created_at: string
                    created_by: string | null
                    description: string | null
                    due_date: string | null
                    findings: string | null
                    id: string
                    labor_cost: number | null
                    machine_id: string | null
                    maintenance_plan_id: string | null
                    notes: string | null
                    organization_id: string
                    parts_cost: number | null
                    photos: string[] | null
                    plant_id: string | null
                    priority: Database["public"]["Enums"]["work_order_priority"]
                    reviewed_at: string | null
                    reviewed_by: string | null
                    scheduled_date: string | null
                    scheduled_start_time: string | null
                    signature_data: Json | null
                    spare_parts_used: Json | null
                    started_at: string | null
                    status: Database["public"]["Enums"]["work_order_status"]
                    title: string
                    total_cost: number | null
                    updated_at: string
                    work_performed: string | null
                    work_type: string
                }
                Insert: {
                    actual_duration_minutes?: number | null
                    assigned_to?: string | null
                    completed_at?: string | null
                    completed_by?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    due_date?: string | null
                    findings?: string | null
                    id?: string
                    labor_cost?: number | null
                    machine_id?: string | null
                    maintenance_plan_id?: string | null
                    notes?: string | null
                    organization_id: string
                    parts_cost?: number | null
                    photos?: string[] | null
                    plant_id?: string | null
                    priority?: Database["public"]["Enums"]["work_order_priority"]
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    scheduled_date?: string | null
                    scheduled_start_time?: string | null
                    signature_data?: Json | null
                    spare_parts_used?: Json | null
                    started_at?: string | null
                    status?: Database["public"]["Enums"]["work_order_status"]
                    title: string
                    total_cost?: number | null
                    updated_at?: string
                    work_performed?: string | null
                    work_type: string
                }
                Update: {
                    actual_duration_minutes?: number | null
                    assigned_to?: string | null
                    completed_at?: string | null
                    completed_by?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    due_date?: string | null
                    findings?: string | null
                    id?: string
                    labor_cost?: number | null
                    machine_id?: string | null
                    maintenance_plan_id?: string | null
                    notes?: string | null
                    organization_id?: string
                    parts_cost?: number | null
                    photos?: string[] | null
                    plant_id?: string | null
                    priority?: Database["public"]["Enums"]["work_order_priority"]
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    scheduled_date?: string | null
                    scheduled_start_time?: string | null
                    signature_data?: Json | null
                    spare_parts_used?: Json | null
                    started_at?: string | null
                    status?: Database["public"]["Enums"]["work_order_status"]
                    title?: string
                    total_cost?: number | null
                    updated_at?: string
                    work_performed?: string | null
                    work_type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "work_orders_machine_id_fkey"
                        columns: ["machine_id"]
                        isOneToOne: false
                        referencedRelation: "machines"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "work_orders_maintenance_plan_id_fkey"
                        columns: ["maintenance_plan_id"]
                        isOneToOne: false
                        referencedRelation: "maintenance_plans"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "work_orders_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "work_orders_plant_id_fkey"
                        columns: ["plant_id"]
                        isOneToOne: false
                        referencedRelation: "plants"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            add_document_version: {
                Args: {
                    p_checksum: string
                    p_document_id: string
                    p_file_name: string
                    p_file_path: string
                    p_file_size: number
                    p_mime_type: string
                }
                Returns: string
            }
            create_document_with_version: {
                Args: {
                    p_category: Database["public"]["Enums"]["document_category"]
                    p_checksum: string
                    p_description: string
                    p_file_name: string
                    p_file_path: string
                    p_file_size: number
                    p_machine_id: string
                    p_mime_type: string
                    p_organization_id: string
                    p_plant_id: string
                    p_title: string
                }
                Returns: string
            }
            create_organization_with_owner: {
                Args: {
                    p_email?: string
                    p_name: string
                    p_phone?: string
                    p_slug: string
                    p_type?: Database["public"]["Enums"]["org_type"]
                }
                Returns: string
            }
            current_manufacturer_org_id: { Args: never; Returns: string }
            current_org_id: { Args: never; Returns: string }
            current_org_is_manufacturer: { Args: never; Returns: boolean }
            current_org_role: { Args: never; Returns: string }
            current_user_role: { Args: never; Returns: string }
            current_user_tenant_id: { Args: never; Returns: string }
            customer_belongs_to_current_manufacturer: {
                Args: { customer_org: string }
                Returns: boolean
            }
            customer_is_linked_to_current_manufacturer: {
                Args: { customer_org: string }
                Returns: boolean
            }
            get_my_context: {
                Args: never
                Returns: {
                    display_name: string
                    email: string
                    org_id: string
                    org_type: string
                    role: string
                    user_id: string
                }[]
            }
            get_user_context: {
                Args: never
                Returns: {
                    display_name: string
                    email: string
                    org_id: string
                    org_type: Database["public"]["Enums"]["org_type"]
                    role: Database["public"]["Enums"]["org_role"]
                    user_id: string
                }[]
            }
            get_user_machine_ids: { Args: never; Returns: string[] }
            get_user_org_ids: { Args: never; Returns: string[] }
            has_org_role: {
                Args: {
                    p_min_role: Database["public"]["Enums"]["org_role"]
                    p_org_id: string
                }
                Returns: boolean
            }
            has_plant_access: { Args: { p_plant_id: string }; Returns: boolean }
            insert_machine_event: {
                Args: {
                    p_actor_type: Database["public"]["Enums"]["event_actor_type"]
                    p_event_type: string
                    p_machine_id: string
                    p_organization_id: string
                    p_payload: Json
                }
                Returns: string
            }
            is_active_member: { Args: { org_id: string }; Returns: boolean }
            is_admin_of_org: { Args: { _org_id: string }; Returns: boolean }
            is_admin_or_supervisor: { Args: never; Returns: boolean }
            is_admin_or_supervisor_in_current_manufacturer: {
                Args: never
                Returns: boolean
            }
            is_admin_or_supervisor_in_current_org: { Args: never; Returns: boolean }
            is_admin_or_supervisor_in_org: { Args: { org: string }; Returns: boolean }
            is_member_in_org: { Args: { org: string }; Returns: boolean }
            is_member_of_org: { Args: { _org_id: string }; Returns: boolean }
            is_platform_admin: { Args: never; Returns: boolean }
            machine_belongs_to_org: {
                Args: { _machine_id: string; _org_id: string }
                Returns: boolean
            }
            machine_is_assigned_to_customer_under_current_manufacturer: {
                Args: { customer_org: string; machine: string }
                Returns: boolean
            }
            machine_is_hidden_for_customer: {
                Args: { customer_org: string; machine: string }
                Returns: boolean
            }
            show_limit: { Args: never; Returns: number }
            show_trgm: { Args: { "": string }; Returns: string[] }
            verify_machine_event_chain: {
                Args: { p_machine_id: string }
                Returns: {
                    actual_previous_hash: string
                    created_at: string
                    event_id: string
                    event_type: string
                    expected_previous_hash: string
                    is_valid: boolean
                    sequence_number: number
                }[]
            }
        }
        Enums: {
            document_category:
            | "technical_manual"
            | "risk_assessment"
            | "ce_declaration"
            | "electrical_schema"
            | "maintenance_manual"
            | "spare_parts_catalog"
            | "training_material"
            | "inspection_report"
            | "certificate"
            | "photo"
            | "video"
            | "other"
            event_actor_type: "user" | "system" | "api" | "webhook"
            machine_lifecycle:
            | "commissioning"
            | "active"
            | "maintenance"
            | "decommissioned"
            | "transferred"
            notification_type:
            | "work_order_assigned"
            | "work_order_completed"
            | "maintenance_due"
            | "document_uploaded"
            | "machine_event"
            | "membership_invite"
            | "system_alert"
            org_role: "admin" | "supervisor" | "technician"
            org_type: "manufacturer" | "customer" | "enterprise"
            work_order_priority: "low" | "medium" | "high" | "critical"
            work_order_status:
            | "draft"
            | "scheduled"
            | "in_progress"
            | "pending_review"
            | "completed"
            | "cancelled"
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
            document_category: [
                "technical_manual",
                "risk_assessment",
                "ce_declaration",
                "electrical_schema",
                "maintenance_manual",
                "spare_parts_catalog",
                "training_material",
                "inspection_report",
                "certificate",
                "photo",
                "video",
                "other",
            ],
            event_actor_type: ["user", "system", "api", "webhook"],
            machine_lifecycle: [
                "commissioning",
                "active",
                "maintenance",
                "decommissioned",
                "transferred",
            ],
            notification_type: [
                "work_order_assigned",
                "work_order_completed",
                "maintenance_due",
                "document_uploaded",
                "machine_event",
                "membership_invite",
                "system_alert",
            ],
            org_role: ["admin", "supervisor", "technician"],
            org_type: ["manufacturer", "customer", "enterprise"],
            work_order_priority: ["low", "medium", "high", "critical"],
            work_order_status: [
                "draft",
                "scheduled",
                "in_progress",
                "pending_review",
                "completed",
                "cancelled",
            ],
        },
    },
} as const

