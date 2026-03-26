import type { ReactNode } from "react";

type CardProps = {
    children: ReactNode;
    hover?: boolean;
    accent?: boolean;
    padding?: string;
    className?: string;
};

export function Card({ children, hover = false, accent = false, padding = "p-6", className = "" }: CardProps) {
    return (
        <div className={`
            bg-surface rounded-xl border border-border-subtle
            ${hover ? 'hover:border-brand/40 hover:shadow-md transition-all group' : ''}
            ${accent ? 'border-l-4 border-l-brand' : ''}
            ${padding}
            ${className}
        `.replace(/\s+/g, ' ').trim()}>
            {children}
        </div>
    );
}
