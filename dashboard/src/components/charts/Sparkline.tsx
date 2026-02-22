'use client';

import { useRef, useEffect } from 'react';

/**
 * Sparkline — lightweight inline chart component for dashboard cards.
 *
 * Renders an SVG sparkline from an array of numeric data points.
 * Supports optional color, gradient, and animated drawing.
 *
 * Usage:
 *   <Sparkline data={[10, 20, 15, 25, 30, 22, 18]} />
 *   <Sparkline data={values} color="#6366f1" height={40} animated />
 */

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
    animated?: boolean;
    showDot?: boolean;
    label?: string;
}

export default function Sparkline({
    data,
    width = 120,
    height = 32,
    color = '#6366f1',
    strokeWidth = 1.5,
    animated = true,
    showDot = true,
    label,
}: SparklineProps) {
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (animated && pathRef.current) {
            const length = pathRef.current.getTotalLength();
            pathRef.current.style.strokeDasharray = `${length}`;
            pathRef.current.style.strokeDashoffset = `${length}`;
            pathRef.current.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
            // Trigger animation
            requestAnimationFrame(() => {
                if (pathRef.current) {
                    pathRef.current.style.strokeDashoffset = '0';
                }
            });
        }
    }, [data, animated]);

    if (!data || data.length < 2) {
        return null;
    }

    const padding = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
        x: padding + (index / (data.length - 1)) * (width - padding * 2),
        y: padding + (1 - (value - min) / range) * (height - padding * 2),
    }));

    // Build SVG path
    const pathD = points
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' ');

    const lastPoint = points[points.length - 1];
    const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 8)}`;

    // Area fill path (for gradient background)
    const areaD = `${pathD} L ${(width - padding).toFixed(1)} ${(height - padding).toFixed(1)} L ${padding.toFixed(1)} ${(height - padding).toFixed(1)} Z`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={label || `Sparkline chart with ${data.length} data points`}
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaD} fill={`url(#${gradientId})`} />

            {/* Line */}
            <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* End dot */}
            {showDot && lastPoint && (
                <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r={2.5}
                    fill={color}
                    stroke="var(--surface-secondary, #1a1a2e)"
                    strokeWidth={1}
                >
                    {animated && (
                        <animate
                            attributeName="opacity"
                            values="0;1"
                            dur="0.8s"
                            fill="freeze"
                        />
                    )}
                </circle>
            )}
        </svg>
    );
}
