'use client';

/**
 * LiveRegion - Accessibility component for announcing dynamic content changes.
 * WCAG 2.1 AA Requirement: 4.1.3 Status Messages
 *
 * Usage:
 *   <LiveRegion message="3 new events received" />
 *   <LiveRegion message="Device updated" mode="assertive" />
 */
interface LiveRegionProps {
    message: string;
    mode?: 'polite' | 'assertive';
}

export default function LiveRegion({ message, mode = 'polite' }: LiveRegionProps) {
    return (
        <div
            role="status"
            aria-live={mode}
            aria-atomic="true"
            style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
            }}
        >
            {message}
        </div>
    );
}
