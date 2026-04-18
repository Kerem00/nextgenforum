import type { ReactNode } from "react";

type CardProps = {
    children: ReactNode;
    hover?: boolean;
    accent?: boolean;
    glass?: boolean;
    glow?: boolean;
    padding?: string;
    className?: string;
    style?: React.CSSProperties;
};

export function Card({ children, hover = false, accent = false, glass = true, glow = false, padding = "p-6", className = "", style }: CardProps) {
    return (
        <div style={style} className={`
            ${glass ? 'glass-card' : 'bg-surface rounded-xl border border-border-subtle'}
            ${hover ? 'glass-card-hover cursor-pointer group' : ''}
            ${accent ? 'border-l-[3px] border-l-brand' : ''}
            ${glow ? 'glow-border glow-border-active' : ''}
            ${padding}
            ${className}
        `.replace(/\s+/g, ' ').trim()}>
            {children}
        </div>
    );
}
