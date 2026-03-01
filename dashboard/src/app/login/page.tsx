'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { IconShieldLock } from '@tabler/icons-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-card__logo">
                    <div
                        className="app-sidebar__logo-icon"
                        style={{ width: 56, height: 56, fontSize: 28, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <IconShieldLock size={32} stroke={1.75} />
                    </div>
                    <h1 className="login-card__title">SmartAccess</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                        IoT Management Platform
                    </p>
                </div>

                {error && <div className="login-card__error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            className="form-input"
                            type="email"
                            placeholder="admin@smartaccess.io"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        className="btn btn--primary"
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
