'use client';

/**
 * SkipLink - Accessibility navigation component.
 * Allows keyboard users to skip directly to the main content.
 * WCAG 2.1 AA Requirement: 2.4.1 Bypass Blocks
 */
export default function SkipLink() {
    return (
        <a
            href="#main-content"
            className="skip-link"
            style={{
                position: 'absolute',
                top: -100,
                left: 0,
                background: 'var(--color-primary)',
                color: 'white',
                padding: '8px 16px',
                zIndex: 9999,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: '0 0 8px 0',
                transition: 'top 0.2s ease-in-out',
            }}
            onFocus={(e) => { (e.target as HTMLElement).style.top = '0'; }}
            onBlur={(e) => { (e.target as HTMLElement).style.top = '-100px'; }}
        >
            Skip to main content
        </a>
    );
}
