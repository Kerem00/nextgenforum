import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useNotifications } from "../context/NotificationContext";
import type { Notification } from "../types/notifications";
import { timeAgo } from "../utils/timeAgo";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";

type FilterTab = "All" | "Unread" | "Likes" | "Comments" | "Mentions" | "System";

export default function NotificationsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [activeTab, setActiveTab] = useState<FilterTab>("All");

    if (!user) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center text-foreground-muted">
                Please <Link to="/login" className="text-brand hover:underline font-semibold">log in</Link> to view your notifications.
            </div>
        );
    }

    const filteredNotifications = useMemo(() => {
        switch (activeTab) {
            case "Unread":
                return notifications.filter(n => !n.read);
            case "Likes":
                return notifications.filter(n => n.type.startsWith("like_"));
            case "Comments":
                return notifications.filter(n => n.type === "comment_on_your_post" || n.type === "reply_to_your_comment");
            case "Mentions":
                return notifications.filter(n => n.type === "mention");
            case "System":
                return notifications.filter(n => n.type === "account_banned" || n.type === "account_unbanned" || n.type === "post_removed_by_admin" || n.type === "comment_removed_by_admin");
            case "All":
            default:
                return notifications;
        }
    }, [notifications, activeTab]);

    const handleNotificationClick = (n: Notification) => {
        markAsRead(n.id);
        if (n.postId) {
            navigate(`/posts/${n.postId}`);
        }
    };

    const getIcon = (type: string) => {
        const iconProps = { className: "w-5 h-5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
        switch (type) {
            case "comment_on_your_post":
            case "comment_removed_by_admin":
                return <svg {...iconProps} className="w-5 h-5 text-blue-400"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
            case "reply_to_your_comment":
                return <svg {...iconProps} className="w-5 h-5 text-indigo-400"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>;
            case "mention":
                return <svg {...iconProps} className="w-5 h-5 text-violet-400"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>;
            case "like_on_your_post":
            case "like_on_your_comment":
                return <svg {...iconProps} className="w-5 h-5 text-red-400"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
            case "comment_pinned":
                return <svg {...iconProps} className="w-5 h-5 text-green-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
            case "post_removed_by_admin":
            case "account_banned":
                return <svg {...iconProps} className="w-5 h-5 text-orange-400"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
            default:
                return <svg {...iconProps} className="w-5 h-5 text-foreground-muted"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.4s ease-out both" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <span className="gradient-text">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="bg-gradient-to-r from-brand to-purple-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg shadow-brand/20 animate-[scaleIn_0.3s_ease-out]">
                            {unreadCount}
                        </span>
                    )}
                </h1>
                <div className="flex gap-4">
                    <button onClick={markAllAsRead} className="btn-ghost text-sm cursor-pointer disabled:opacity-50" disabled={unreadCount === 0}>
                        Mark all as read
                    </button>
                    <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50" disabled={notifications.length === 0}>
                        Clear all
                    </button>
                </div>
            </div>

            <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
                {(["All", "Unread", "Likes", "Comments", "Mentions", "System"] as FilterTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
                            activeTab === tab
                                ? "bg-gradient-to-r from-brand to-purple-600 text-white shadow-lg shadow-brand/20"
                                : "glass-surface text-foreground-muted hover:text-foreground"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {filteredNotifications.length === 0 ? (
                <Card padding="py-16" className="text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand/5 flex items-center justify-center mb-5" style={{ animation: "float 3s ease-in-out infinite" }}>
                        <svg className="w-8 h-8 text-brand/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No notifications here</h3>
                    <p className="text-sm text-foreground-muted">
                        {activeTab === "All" 
                            ? "When you get notifications, they'll show up here."
                            : `You don't have any ${activeTab.toLowerCase()} notifications.`}
                    </p>
                </Card>
            ) : (
                <Card padding="p-0" className="overflow-hidden">
                    <div className="divide-y divide-border-subtle">
                        {filteredNotifications.map((n, i) => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left p-5 flex gap-4 hover:bg-surface-hover transition-all duration-300 cursor-pointer relative group ${!n.read ? 'bg-brand/3' : ''}`}
                                style={{ animation: `fadeInUp 0.3s ease-out ${i * 30}ms both` }}
                            >
                                {!n.read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-brand to-purple-500 rounded-r" />
                                )}
                                <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center group-hover:bg-brand/10 transition-all duration-300">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-foreground text-sm">
                                        <span className="font-bold">{n.actorUsername || "System"}</span>{" "}
                                        <span className="text-foreground-muted">{n.message.replace(`${n.actorUsername} ` || '', '')}</span>
                                    </p>
                                    {n.postTitle && (
                                        <p className="text-sm text-foreground-muted italic truncate mt-1">
                                            {n.postTitle}
                                        </p>
                                    )}
                                    {n.commentPreview && (
                                        <p className="text-sm text-foreground-muted italic truncate mt-1">
                                            {n.commentPreview}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-xs text-foreground-muted whitespace-nowrap font-medium">
                                    {timeAgo(n.createdAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
