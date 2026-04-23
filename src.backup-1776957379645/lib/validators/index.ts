/**
 * Input validation utilities for API endpoints
 */

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

// Generic validators
export const validators = {
    required: (value: unknown, fieldName: string): ValidationError | null => {
        if (value === undefined || value === null || value === "") {
            return { field: fieldName, message: `${fieldName} is required` };
        }
        return null;
    },

    string: (value: unknown, fieldName: string): ValidationError | null => {
        if (value !== undefined && value !== null && typeof value !== "string") {
            return { field: fieldName, message: `${fieldName} must be a string` };
        }
        return null;
    },

    minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
        if (value && value.length < min) {
            return { field: fieldName, message: `${fieldName} must be at least ${min} characters` };
        }
        return null;
    },

    maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
        if (value && value.length > max) {
            return { field: fieldName, message: `${fieldName} must be at most ${max} characters` };
        }
        return null;
    },

    email: (value: string, fieldName: string): ValidationError | null => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            return { field: fieldName, message: `${fieldName} must be a valid email address` };
        }
        return null;
    },

    uuid: (value: string, fieldName: string): ValidationError | null => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (value && !uuidRegex.test(value)) {
            return { field: fieldName, message: `${fieldName} must be a valid UUID` };
        }
        return null;
    },

    number: (value: unknown, fieldName: string): ValidationError | null => {
        if (value !== undefined && value !== null && typeof value !== "number") {
            return { field: fieldName, message: `${fieldName} must be a number` };
        }
        return null;
    },

    positiveNumber: (value: number, fieldName: string): ValidationError | null => {
        if (value !== undefined && value !== null && value < 0) {
            return { field: fieldName, message: `${fieldName} must be a positive number` };
        }
        return null;
    },

    boolean: (value: unknown, fieldName: string): ValidationError | null => {
        if (value !== undefined && value !== null && typeof value !== "boolean") {
            return { field: fieldName, message: `${fieldName} must be a boolean` };
        }
        return null;
    },

    date: (value: string, fieldName: string): ValidationError | null => {
        if (value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { field: fieldName, message: `${fieldName} must be a valid date` };
            }
        }
        return null;
    },

    enum: (value: string, allowed: string[], fieldName: string): ValidationError | null => {
        if (value && !allowed.includes(value)) {
            return { field: fieldName, message: `${fieldName} must be one of: ${allowed.join(", ")}` };
        }
        return null;
    },

    array: (value: unknown, fieldName: string): ValidationError | null => {
        if (value !== undefined && value !== null && !Array.isArray(value)) {
            return { field: fieldName, message: `${fieldName} must be an array` };
        }
        return null;
    }
};

// Equipment validation
export function validateEquipment(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        // Required fields for create
        const nameError = validators.required(data.name, "name");
        if (nameError) errors.push(nameError);

        const codeError = validators.required(data.equipment_code, "equipment_code");
        if (codeError) errors.push(codeError);

        const categoryError = validators.required(data.category, "category");
        if (categoryError) errors.push(categoryError);
    }

    // String validations
    if (data.name) {
        const err = validators.maxLength(data.name as string, 255, "name");
        if (err) errors.push(err);
    }

    if (data.equipment_code) {
        const err = validators.maxLength(data.equipment_code as string, 100, "equipment_code");
        if (err) errors.push(err);
    }

    // Status validation
    if (data.status) {
        const statusError = validators.enum(
            data.status as string,
            ["active", "inactive", "under_maintenance", "decommissioned"],
            "status"
        );
        if (statusError) errors.push(statusError);
    }

    // Date validations
    if (data.purchase_date) {
        const err = validators.date(data.purchase_date as string, "purchase_date");
        if (err) errors.push(err);
    }

    if (data.warranty_expiry) {
        const err = validators.date(data.warranty_expiry as string, "warranty_expiry");
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}

// Checklist validation
export function validateChecklist(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        const nameError = validators.required(data.name, "name");
        if (nameError) errors.push(nameError);
    }

    if (data.name) {
        const err = validators.maxLength(data.name as string, 255, "name");
        if (err) errors.push(err);
    }

    if (data.is_active !== undefined) {
        const err = validators.boolean(data.is_active, "is_active");
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}

// Checklist Item validation
export function validateChecklistItem(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        const titleError = validators.required(data.title, "title");
        if (titleError) errors.push(titleError);

        const checklistIdError = validators.required(data.checklist_id, "checklist_id");
        if (checklistIdError) errors.push(checklistIdError);
    }

    if (data.checklist_id) {
        const err = validators.uuid(data.checklist_id as string, "checklist_id");
        if (err) errors.push(err);
    }

    if (data.title) {
        const err = validators.maxLength(data.title as string, 255, "title");
        if (err) errors.push(err);
    }

    if (data.input_type) {
        const err = validators.enum(
            data.input_type as string,
            ["checkbox", "text", "number", "photo", "signature", "select"],
            "input_type"
        );
        if (err) errors.push(err);
    }

    if (data.order_index !== undefined) {
        const err = validators.number(data.order_index, "order_index");
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}

// Maintenance Schedule validation
export function validateMaintenanceSchedule(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        const titleError = validators.required(data.title, "title");
        if (titleError) errors.push(titleError);

        const equipmentIdError = validators.required(data.equipment_id, "equipment_id");
        if (equipmentIdError) errors.push(equipmentIdError);
    }

    if (data.equipment_id) {
        const err = validators.uuid(data.equipment_id as string, "equipment_id");
        if (err) errors.push(err);
    }

    if (data.title) {
        const err = validators.maxLength(data.title as string, 255, "title");
        if (err) errors.push(err);
    }

    if (data.frequency) {
        const err = validators.enum(
            data.frequency as string,
            ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"],
            "frequency"
        );
        if (err) errors.push(err);
    }

    if (data.next_due_date) {
        const err = validators.date(data.next_due_date as string, "next_due_date");
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}

// Checklist Execution validation
export function validateChecklistExecution(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        const checklistIdError = validators.required(data.checklist_id, "checklist_id");
        if (checklistIdError) errors.push(checklistIdError);
    }

    if (data.checklist_id) {
        const err = validators.uuid(data.checklist_id as string, "checklist_id");
        if (err) errors.push(err);
    }

    if (data.equipment_id) {
        const err = validators.uuid(data.equipment_id as string, "equipment_id");
        if (err) errors.push(err);
    }

    if (data.status) {
        const err = validators.enum(
            data.status as string,
            ["pending", "in_progress", "completed", "cancelled"],
            "status"
        );
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}

// User validation
export function validateUser(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isUpdate) {
        const emailError = validators.required(data.email, "email");
        if (emailError) errors.push(emailError);

        const roleError = validators.required(data.role, "role");
        if (roleError) errors.push(roleError);
    }

    if (data.email) {
        const err = validators.email(data.email as string, "email");
        if (err) errors.push(err);
    }

    if (data.role) {
        const err = validators.enum(
            data.role as string,
            ["admin", "supervisor", "technician"],
            "role"
        );
        if (err) errors.push(err);
    }

    if (data.full_name) {
        const err = validators.maxLength(data.full_name as string, 255, "full_name");
        if (err) errors.push(err);
    }

    return { valid: errors.length === 0, errors };
}
