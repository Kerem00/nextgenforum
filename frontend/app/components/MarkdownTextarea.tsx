import React, { useRef, useImperativeHandle, forwardRef } from 'react';

type MarkdownTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    value: string;
    onValueChange: (val: string) => void;
    knownUsers?: { id: number; username: string }[];
};

const MarkdownTextarea = forwardRef<HTMLTextAreaElement, MarkdownTextareaProps>(
    ({ value, onValueChange, className = "", knownUsers = [], ...props }, ref) => {
        const innerRef = useRef<HTMLTextAreaElement>(null);
        
        // Expose innerRef to the parent through the forwarded ref
        useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

        const textareaRef = innerRef;

        // Mention state
        const [mentionOpen, setMentionOpen] = React.useState(false);
        const [mentionQuery, setMentionQuery] = React.useState("");
        const [selectedIndex, setSelectedIndex] = React.useState(0);
        const [mentionStart, setMentionStart] = React.useState(0);

        const filteredUsers = React.useMemo(() => {
            if (!mentionOpen) return [];
            return knownUsers
                .filter(u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()))
                .slice(0, 5);
        }, [mentionOpen, mentionQuery, knownUsers]);

        React.useEffect(() => {
            setSelectedIndex(0);
        }, [mentionQuery, mentionOpen]);

        const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const val = e.target.value;
            onValueChange(val);

            // Check if we are typing a mention
            const cursor = e.target.selectionStart;
            const textBeforeCursor = val.substring(0, cursor);
            
            // Regex to find an @ that is either at the start of the string or preceded by whitespace
            // followed by alphanumeric characters until the cursor
            const match = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(textBeforeCursor);
            
            if (match) {
                setMentionOpen(true);
                setMentionQuery(match[1]);
                setMentionStart(cursor - match[1].length - 1); // Index of the @
            } else {
                setMentionOpen(false);
            }
        };

        const handleSelectMention = (username: string) => {
            if (!textareaRef.current) return;
            
            const beforeMention = value.substring(0, mentionStart);
            const afterMention = value.substring(textareaRef.current.selectionStart);
            const newText = beforeMention + `@${username} ` + afterMention;
            
            onValueChange(newText);
            setMentionOpen(false);
            
            // Restore cursor after the inserted space
            const newCursor = mentionStart + username.length + 2;
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursor, newCursor);
                }
            }, 0);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (!mentionOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            } else if (e.key === 'Enter') {
                if (filteredUsers.length > 0) {
                    e.preventDefault();
                    handleSelectMention(filteredUsers[selectedIndex].username);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
            }
        };

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        const newText = textarea.value.substring(0, start) + before + selectedText + after + textarea.value.substring(end);

        onValueChange(newText);

        // Timeout to ensure react state is updated before restoring selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    return (
        <div className={`flex flex-col border border-border-subtle rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent transition-all bg-background ${className}`}>
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border-subtle bg-surface-hover/30">
                <button type="button" onClick={() => insertText('**', '**')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
                </button>
                <button type="button" onClick={() => insertText('*', '*')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Italic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
                </button>
                <button type="button" onClick={() => insertText('~~', '~~')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Strikethrough">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" y1="12" x2="20" y2="12" /></svg>
                </button>
                <div className="w-px h-4 bg-border-subtle mx-1"></div>
                <button type="button" onClick={() => insertText('### ', '')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Heading">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M4 18V6M20 18V6" /></svg>
                </button>
                <button type="button" onClick={() => insertText('> ', '')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Quote">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
                </button>
                <button type="button" onClick={() => insertText('`', '`')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Code">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                </button>
                <button type="button" onClick={() => insertText('```\n', '\n```')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Code Block">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                </button>
                <div className="w-px h-4 bg-border-subtle mx-1"></div>
                <button type="button" onClick={() => insertText('- ', '')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Bullet List">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                </button>
                <button type="button" onClick={() => insertText('1. ', '')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Numbered List">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>
                </button>
                <button type="button" onClick={() => insertText('[', '](url)')} className="p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                </button>
            </div>
            <div className="relative w-full">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleTextChange}
                    onKeyDown={(e) => {
                        handleKeyDown(e);
                        if (props.onKeyDown) props.onKeyDown(e);
                    }}
                    className="w-full px-4 py-3 bg-background border-0 focus:ring-0 outline-none resize-y text-foreground placeholder-[var(--theme-foreground-muted)] min-h-[100px]"
                    {...props}
                />
                
                {mentionOpen && filteredUsers.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 min-w-[200px] bg-surface border border-border-subtle rounded-xl shadow-lg overflow-hidden z-20">
                        {filteredUsers.map((u, i) => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectMention(u.username)}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                                    i === selectedIndex 
                                        ? "bg-brand/10 text-brand font-medium" 
                                        : "text-foreground hover:bg-surface-hover hover:text-brand"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center font-bold text-[10px] text-brand uppercase">
                                        {u.username.charAt(0)}
                                    </div>
                                    {u.username}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MarkdownTextarea;
