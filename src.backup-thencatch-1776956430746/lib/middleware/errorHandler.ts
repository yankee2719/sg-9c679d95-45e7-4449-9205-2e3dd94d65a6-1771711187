import { NextApiResponse } from "next";
import { ValidationResult } from "../validators";

export class ApiError extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "ApiError";
    }

    static badRequest(message: string = "Bad request") {
        return new ApiError(message, 400, "BAD_REQUEST");
    }

    static unauthorized(message: string = "Unauthorized") {
        return new ApiError(message, 401, "UNAUTHORIZED");
    }

    static forbidden(message: string = "Forbidden") {
        return new ApiError(message, 403, "FORBIDDEN");
    }

    static notFound(message: string = "Resource not found") {
        return new ApiError(message, 404, "NOT_FOUND");
    }

    static methodNotAllowed(method: string) {
        return new ApiError(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED");
    }

    static conflict(message: string = "Resource already exists") {
        return new ApiError(message, 409, "CONFLICT");
    }

    static validationError(message: string = "Validation failed") {
        return new ApiError(message, 422, "VALIDATION_ERROR");
    }

    static internal(message: string = "Internal server error") {
        return new ApiError(message, 500, "INTERNAL_ERROR");
    }
}

export interface ErrorResponse {
    error: string;
    code: string;
    message: string;
    details?: unknown;
}

/**
 * Send an error response
 */
export function sendError(res: NextApiResponse, error: ApiError | Error, details?: unknown): void {
    if (error instanceof ApiError) {
        const response: ErrorResponse = {
            error: error.code,
            code: error.code,
            message: error.message,
        };
        if (details) {
            response.details = details;
        }
        res.status(error.statusCode).json(response);
    } else {
        // Log unexpected errors
        console.error("Unexpected error:", error);
        res.status(500).json({
            error: "INTERNAL_ERROR",
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        });
    }
}

/**
 * Send validation error response
 */
export function sendValidationError(res: NextApiResponse, validation: ValidationResult): void {
    res.status(422).json({
        error: "VALIDATION_ERROR",
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: validation.errors,
    });
}

/**
 * Send success response with data
 */
export function sendSuccess<T>(res: NextApiResponse, data: T, statusCode: number = 200): void {
    res.status(statusCode).json({
        success: true,
        data,
    });
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
    res: NextApiResponse,
    data: T[],
    total: number,
    page: number,
    limit: number
): void {
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        },
    });
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: { code?: string; message: string; details?: string }): ApiError {
    // Handle common Supabase error codes
    switch (error.code) {
        case "PGRST116": // Not found
            return ApiError.notFound(error.message || "Resource not found");
        case "23505": // Unique violation
            return ApiError.conflict(error.message || "Resource already exists");
        case "23503": // Foreign key violation
            return ApiError.badRequest(error.message || "Referenced resource not found");
        case "42501": // Insufficient privileges
            return ApiError.forbidden(error.message || "Insufficient permissions");
        case "PGRST301": // Multiple rows returned
            return ApiError.internal("Multiple rows returned when one expected");
        default:
            console.error("Supabase error:", error);
            return ApiError.internal(error.message || "Database error");
    }
}

/**
 * Method handler wrapper with error handling
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function handleMethods(
    allowedMethods: HttpMethod[],
    handlers: Partial<Record<HttpMethod, () => Promise<void>>>
) {
    return async (method: string | undefined, res: NextApiResponse) => {
        const normalizedMethod = (method?.toUpperCase() || "GET") as HttpMethod;

        if (!allowedMethods.includes(normalizedMethod)) {
            sendError(res, ApiError.methodNotAllowed(normalizedMethod));
            return false;
        }

        const handler = handlers[normalizedMethod];
        if (!handler) {
            sendError(res, ApiError.methodNotAllowed(normalizedMethod));
            return false;
        }

        try {
            await handler();
            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                sendError(res, error);
            } else {
                sendError(res, error as Error);
            }
            return false;
        }
    };
}
