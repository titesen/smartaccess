'use client';

import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, type User } from '../../../../lib/api';
import Breadcrumbs from '../../../../components/navigation/Breadcrumbs';
import LiveRegion from '../../../../components/accessibility/LiveRegion';

const ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', role: 'VIEWER' });

    const load = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = await createUser(form);
            setUsers((prev) => [...prev, user]);
            setForm({ email: '', password: '', role: 'VIEWER' });
            setShowCreate(false);
            setStatusMsg(`User ${user.email} created`);
        } catch {
            setStatusMsg('Failed to create user');
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            const updated = await updateUser(user.id, { isActive: !user.isActive });
            setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u));
            setStatusMsg(`User ${user.email} ${updated.isActive ? 'activated' : 'deactivated'}`);
        } catch {
            setStatusMsg('Failed to update user');
        }
    };

    const handleRoleChange = async (user: User, role: string) => {
        try {
            const updated = await updateUser(user.id, { role });
            setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u));
            setStatusMsg(`User ${user.email} role changed to ${role}`);
        } catch {
            setStatusMsg('Failed to update role');
        }
    };

    return (
        <>
            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Admin' },
                { label: 'Users' },
            ]} />
            <LiveRegion message={statusMsg} />

            <div className="app-header">
                <div>
                    <h1 className="app-header__title">User Management</h1>
                    <p className="app-header__subtitle">{users.length} users</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(!showCreate)}>
                        {showCreate ? '✕ Cancel' : '+ New User'}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
                </div>
            </div>

            {/* Create user form */}
            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className="monitoring-card"
                    style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label htmlFor="email" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="form-input"
                            style={{ minWidth: 220 }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label htmlFor="password" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="form-input"
                            style={{ minWidth: 160 }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label htmlFor="role" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Role</label>
                        <select
                            id="role"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="form-input"
                        >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn btn--primary btn--sm">Create</button>
                </form>
            )}

            {/* Users table */}
            <div className="table-container">
                <table className="table">
                    <caption className="sr-only">System users and their roles</caption>
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Email</th>
                            <th scope="col">Role</th>
                            <th scope="col">Status</th>
                            <th scope="col">Created</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.5 }}>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{user.id}</td>
                                <td style={{ fontSize: 13, fontWeight: 500 }}>{user.email}</td>
                                <td>
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user, e.target.value)}
                                        className="form-input"
                                        style={{ fontSize: 12, padding: '2px 6px' }}
                                        aria-label={`Role for ${user.email}`}
                                    >
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <span className={`badge ${user.isActive ? 'badge--online' : 'badge--offline'}`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                    <button
                                        className={`btn btn--sm ${user.isActive ? 'btn--ghost' : 'btn--primary'}`}
                                        onClick={() => handleToggleActive(user)}
                                    >
                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
