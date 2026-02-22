'use client';

import Link from 'next/link';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

/**
 * Reusable breadcrumb navigation component (WCAG 2.4.8).
 * Last item is rendered as current page (no link).
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}
        >
            <ol
                style={{
                    listStyle: 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    padding: 0,
                    margin: 0,
                }}
            >
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;
                    return (
                        <li
                            key={item.label}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            {idx > 0 && (
                                <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                                    ›
                                </span>
                            )}
                            {isLast || !item.href ? (
                                <span
                                    aria-current="page"
                                    style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                                >
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    style={{ textDecoration: 'underline', color: 'inherit' }}
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
