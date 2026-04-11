import { useEffect, useState } from "react";
import type { AdminReport } from "../routes/admin";
import { postsClient } from "../api";
import { Link } from "react-router";

type ReportDetailsModalProps = {
    report: AdminReport;
    onClose: () => void;
    onResolve: () => void;
    onBan: () => void;
};

export function ReportDetailsModal({ report, onClose, onResolve, onBan }: ReportDetailsModalProps) {
    const [contentData, setContentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                if (report.entity_type === "post") {
                    const res = await postsClient.get(`/posts/${report.entity_id}?report_visit=true`);
                    setContentData(res.data);
                } else if (report.entity_type === "comment") {
                    const res = await postsClient.get(`/comments/${report.entity_id}?report_visit=true`);
                    setContentData(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch reported content", err);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [report]);

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString('en-US', { hour12: false });
    };

    const getVisitLink = () => {
        if (report.entity_type === "post") {
            return `/posts/${report.entity_id}?report_visit=true&status=${contentData?.status || ''}`;
        } else {
            // we need the post_id from the comment
            if (contentData?.post_id) {
                return `/posts/${contentData.post_id}?report_visit=${report.entity_id}&status=${contentData?.status || ''}`;
            }
            return "#";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border-subtle p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6 border-b border-border-subtle pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Report #{report.id} Details</h2>
                        <p className="text-sm text-foreground-muted mt-1 capitalize">Target: {report.entity_type}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm bg-background p-4 rounded-lg border border-border-subtle">
                        <div>
                            <span className="text-foreground-muted block mb-1">Report Reason</span>
                            <span className="font-semibold text-foreground capitalize">{report.reason.replace('_', ' ')}</span>
                        </div>
                        <div>
                            <span className="text-foreground-muted block mb-1">Report Description</span>
                            <span className="text-foreground">{report.context || <em>No description provided</em>}</span>
                        </div>
                    </div>

                    <div className="bg-background p-4 rounded-lg border border-border-subtle">
                        <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border-subtle pb-2">Target Content</h3>
                        {loading ? (
                            <div className="animate-pulse h-10 bg-border-subtle rounded w-full"></div>
                        ) : contentData ? (
                            <div>
                                <div className="text-sm text-foreground my-2 whitespace-pre-wrap p-3 bg-surface-hover rounded-md border border-border-subtle">
                                    {contentData.content}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs mt-4 items-center">
                                    <div>
                                        <span className="text-foreground-muted block">Content Created At:</span>
                                        <span className="font-medium text-foreground">{formatDate(contentData.created_at)}</span>
                                    </div>
                                    <div>
                                        <span className="text-foreground-muted block">Report Submitted At:</span>
                                        <span className="font-medium text-foreground">{formatDate(report.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-500 text-sm py-4 text-center">
                                Content not found. It may have been permanently deleted earlier.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-border-subtle">
                    {contentData && getVisitLink() !== "#" && (
                        <Link 
                            to={getVisitLink()}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center justify-center"
                        >
                            Visit Post
                        </Link>
                    )}
                    <button
                        onClick={onResolve}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 transition-all cursor-pointer"
                    >
                        Resolve
                    </button>
                    <button
                        onClick={onBan}
                        disabled={!contentData}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20 transition-all ${
                            !contentData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20 cursor-pointer'
                        }`}
                    >
                        Remove Content
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-surface-hover text-foreground hover:bg-border-subtle border border-border-subtle transition-all cursor-pointer ml-4"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
