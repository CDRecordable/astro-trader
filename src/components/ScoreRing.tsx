// ============================================================
// Score Ring - Circular score indicator
// ============================================================

"use client";

import React from "react";

interface ScoreRingProps {
    score: number;         // 0-100
    size?: number;         // px
    strokeWidth?: number;
    recommendation?: string;
}

function getColor(score: number): string {
    if (score >= 75) return "var(--signal-strong-buy)";
    if (score >= 55) return "var(--signal-buy)";
    if (score >= 35) return "var(--signal-hold)";
    return "var(--signal-avoid)";
}

export default function ScoreRing({
    score,
    size = 64,
    strokeWidth = 4,
    recommendation,
}: ScoreRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const color = getColor(score);

    return (
        <div className="score-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--bg-tertiary)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                        transition: "stroke-dashoffset 0.6s ease-out",
                        filter: `drop-shadow(0 0 4px ${color})`,
                    }}
                />
            </svg>
            <div
                className="absolute flex flex-col items-center"
                style={{ color }}
            >
                <span className="text-sm font-bold leading-none">{score}</span>
                {recommendation && (
                    <span className="text-[8px] uppercase tracking-wider opacity-70 leading-none mt-0.5">
                        {recommendation}
                    </span>
                )}
            </div>
        </div>
    );
}
