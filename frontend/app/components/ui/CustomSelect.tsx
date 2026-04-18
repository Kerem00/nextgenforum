import { useState } from "react";

export type SelectOption = { value: string; label: string };

export function CustomSelect({ value, onChange, options, className = "" }: { value: string, onChange: (v: string) => void, options: SelectOption[], className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full h-full flex items-center justify-between gap-3 px-3 py-1.5 glass-surface rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 hover:border-brand/40 transition-all cursor-pointer"
      >
        <span className="whitespace-nowrap capitalize font-medium">{currentLabel}</span>
        <svg className={`w-4 h-4 text-foreground-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      <div className={`absolute left-0 top-full mt-2 w-full glass-card z-40 overflow-hidden transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-100 max-h-[250px]' : 'opacity-0 scale-95 pointer-events-none max-h-0'}`}>
        <div className="py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); }}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-all whitespace-nowrap capitalize cursor-pointer ${value === opt.value ? 'bg-brand/10 text-brand font-semibold' : 'text-foreground hover:bg-surface-hover hover:text-brand'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
