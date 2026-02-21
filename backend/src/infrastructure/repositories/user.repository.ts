import type pg from 'pg';
import type { User, UserRole } from '../../domain/auth/auth.types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IUserRepository {
    findByEmail(client: pg.PoolClient, email: string): Promise<User | null>;
    findById(client: pg.PoolClient, id: number): Promise<User | null>;
    create(client: pg.PoolClient, email: string, passwordHash: string, role: UserRole): Promise<User>;
}

// ---------------------------------------------------------------------------
// PostgreSQL Implementation
// ---------------------------------------------------------------------------

export class PgUserRepository implements IUserRepository {
    async findByEmail(client: pg.PoolClient, email: string): Promise<User | null> {
        const { rows } = await client.query(
            `SELECT id, email, password_hash, role, is_active, created_at, updated_at
             FROM users WHERE email = $1`,
            [email],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async findById(client: pg.PoolClient, id: number): Promise<User | null> {
        const { rows } = await client.query(
            `SELECT id, email, password_hash, role, is_active, created_at, updated_at
             FROM users WHERE id = $1`,
            [id],
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    async create(
        client: pg.PoolClient,
        email: string,
        passwordHash: string,
        role: UserRole,
    ): Promise<User> {
        const { rows } = await client.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, password_hash, role, is_active, created_at, updated_at`,
            [email, passwordHash, role],
        );
        return this.mapRow(rows[0]);
    }

    private mapRow(row: Record<string, unknown>): User {
        return {
            id: row.id as number,
            email: row.email as string,
            passwordHash: row.password_hash as string,
            role: row.role as UserRole,
            isActive: row.is_active as boolean,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
        };
    }
}
