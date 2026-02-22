import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger/logger.js';

/**
 * Schema definition for input validation.
 * Each field can specify type, required status, and a custom validator.
 */
interface FieldSchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: readonly string[];
    validate?: (value: unknown) => boolean;
}

interface ValidationSchema {
    body?: Record<string, FieldSchema>;
    params?: Record<string, FieldSchema>;
    query?: Record<string, FieldSchema>;
}

interface ValidationError {
    field: string;
    message: string;
    location: 'body' | 'params' | 'query';
}

function validateField(
    value: unknown,
    schema: FieldSchema,
    fieldName: string,
): string | null {
    // Required check
    if (schema.required && (value === undefined || value === null || value === '')) {
        return `${fieldName} is required`;
    }

    // If not required and not present, skip further checks
    if (value === undefined || value === null) {
        return null;
    }

    // Type check
    if (schema.type === 'array') {
        if (!Array.isArray(value)) {
            return `${fieldName} must be an array`;
        }
    } else if (typeof value !== schema.type) {
        return `${fieldName} must be of type ${schema.type}`;
    }

    // String-specific validations
    if (schema.type === 'string' && typeof value === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            return `${fieldName} must be at least ${schema.minLength} characters`;
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            return `${fieldName} must be at most ${schema.maxLength} characters`;
        }
        if (schema.pattern && !schema.pattern.test(value)) {
            return `${fieldName} has invalid format`;
        }
        if (schema.enum && !schema.enum.includes(value)) {
            return `${fieldName} must be one of: ${schema.enum.join(', ')}`;
        }
    }

    // Number-specific validations
    if (schema.type === 'number' && typeof value === 'number') {
        if (schema.min !== undefined && value < schema.min) {
            return `${fieldName} must be >= ${schema.min}`;
        }
        if (schema.max !== undefined && value > schema.max) {
            return `${fieldName} must be <= ${schema.max}`;
        }
    }

    // Custom validator
    if (schema.validate && !schema.validate(value)) {
        return `${fieldName} is invalid`;
    }

    return null;
}

/**
 * Middleware factory that validates request inputs against a schema.
 * Returns 400 with structured error details on validation failure.
 */
export function validateInput(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const errors: ValidationError[] = [];

        // Validate each location (body, params, query)
        const locations = [
            { name: 'body' as const, data: req.body, fields: schema.body },
            { name: 'params' as const, data: req.params, fields: schema.params },
            { name: 'query' as const, data: req.query, fields: schema.query },
        ];

        for (const loc of locations) {
            if (!loc.fields) continue;

            for (const [fieldName, fieldSchema] of Object.entries(loc.fields)) {
                const value = loc.data?.[fieldName];
                const error = validateField(value, fieldSchema, fieldName);
                if (error) {
                    errors.push({ field: fieldName, message: error, location: loc.name });
                }
            }
        }

        if (errors.length > 0) {
            logger.warn('Input validation failed', {
                path: req.path,
                method: req.method,
                errors,
            });

            res.status(400).json({
                error: 'Validation Error',
                details: errors,
            });
            return;
        }

        next();
    };
}

// ---------------------------------------------------------------------------
// Reusable schema presets
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const schemas = {
    uuidParam: {
        params: {
            id: { type: 'string' as const, required: true, pattern: UUID_PATTERN },
        },
    },

    login: {
        body: {
            email: {
                type: 'string' as const,
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                maxLength: 255,
            },
            password: {
                type: 'string' as const,
                required: true,
                minLength: 6,
                maxLength: 128,
            },
        },
    },

    register: {
        body: {
            email: {
                type: 'string' as const,
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                maxLength: 255,
            },
            password: {
                type: 'string' as const,
                required: true,
                minLength: 6,
                maxLength: 128,
            },
            role: {
                type: 'string' as const,
                required: false,
                enum: ['ADMIN', 'OPERATOR', 'VIEWER'] as const,
            },
        },
    },

    updateDeviceStatus: {
        body: {
            status: {
                type: 'string' as const,
                required: true,
                enum: [
                    'REGISTERED', 'ONLINE', 'OFFLINE',
                    'ERROR', 'MAINTENANCE', 'DECOMMISSIONED',
                ] as const,
            },
        },
    },

    paginationQuery: {
        query: {
            limit: { type: 'string' as const, required: false, pattern: /^\d+$/ },
            offset: { type: 'string' as const, required: false, pattern: /^\d+$/ },
        },
    },
};
