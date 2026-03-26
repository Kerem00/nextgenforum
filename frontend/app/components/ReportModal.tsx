import { useState } from "react";
import { CustomSelect } from "./ui/CustomSelect";

type ReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    entityType: 'post' | 'comment';
    entityId: number;
};

export function ReportModal({ isOpen, onClose, entityType, entityId }: ReportModalProps) {
    const [reason, setReason] = useState("spam");
    const [context, setContext] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Stub: Mock wait
        setTimeout(() => {
            console.log(`Report submitted: ${entityType} ${entityId}, Reason: ${reason}, Context: ${context}`);
            setIsSubmitting(false);
            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                onClose();
            }, 2000);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border-subtle rounded-xl p-6 max-w-sm w-full shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-foreground">Report {entityType === 'post' ? 'Post' : 'Comment'}</h3>
                    <button onClick={onClose} className="text-foreground-muted hover:text-foreground cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                {isSubmitted ? (
                    <div className="text-center py-6 text-green-500 font-medium">
                        Thank you for your report. We'll review it shortly.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                            <CustomSelect
                                value={reason}
                                onChange={setReason}
                                options={[
                                    { value: "spam", label: "Spam" },
                                    { value: "hate_speech", label: "Hate speech" },
                                    { value: "misinformation", label: "Misinformation" },
                                    { value: "other", label: "Other" }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Additional Context (Optional)</label>
                            <textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand text-foreground placeholder-[var(--theme-foreground-muted)]"
                                rows={3}
                            ></textarea>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Report"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
