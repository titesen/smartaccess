'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getStoredUser, logout } from '../../lib/api';
import SkipLink from '../../components/accessibility/SkipLink';

const NAV_ITEMS = [
    { href: '/dashboard', icon: '📊', label: 'Overview' },
    { href: '/dashboard/devices', icon: '📡', label: 'Devices' },
    { href: '/dashboard/events', icon: '⚡', label: 'Events' },
    { href: '/dashboard/events/live', icon: '📺', label: 'Live Stream' },
    { href: '/dashboard/events/dlq', icon: '☠️', label: 'Dead Letter' },
    { href: '/dashboard/monitoring', icon: '🚨', label: 'Alerts', group: 'Monitoring' },
    { href: '/dashboard/monitoring/metrics', icon: '📈', label: 'Metrics' },
    { href: '/dashboard/monitoring/health', icon: '💚', label: 'Health' },
    { href: '/dashboard/admin/users', icon: '👥', label: 'Users', group: 'Admin' },
    { href: '/dashboard/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        setUser(getStoredUser());
    }, [router]);

    if (!user) return null; // Loading state while checking auth

    return (
        <div className="app-layout">
            <SkipLink />
            {/* Sidebar */}
            <aside className="app-sidebar" role="navigation" aria-label="Main navigation">
                <div className="app-sidebar__logo">
                    <div className="app-sidebar__logo-icon">🔐</div>
                    <span className="app-sidebar__logo-text">SmartAccess</span>
                </div>

                <nav className="app-sidebar__nav">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`app-sidebar__link ${pathname === item.href ? 'app-sidebar__link--active' : ''
                                }`}
                            aria-current={pathname === item.href ? 'page' : undefined}
                        >
                            <span className="app-sidebar__link-icon" aria-hidden="true">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="app-sidebar__footer">
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {user.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        Role: {user.role}
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main id="main-content" className="app-main" role="main">{children}</main>
        </div>
    );
}

