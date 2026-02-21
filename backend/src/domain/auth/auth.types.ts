// ---------------------------------------------------------------------------
// Auth types
// ---------------------------------------------------------------------------

export enum UserRole {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR',
    VIEWER = 'VIEWER',
}

export interface JwtPayload {
    userId: number;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export interface AuthUser {
    id: number;
    email: string;
    role: UserRole;
}

export interface User {
    id: number;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
