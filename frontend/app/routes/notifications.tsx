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
                Please <Link to="/login" className="text-brand hover:underline">log in</Link> to view your notifications.
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
        switch (type) {
            case "comment_on_your_post":
            case "comment_removed_by_admin":
                return <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
            case "reply_to_your_comment":
                return <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>;
            case "mention":
                return <svg className="w-5 h-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>;
            case "like_on_your_post":
            case "like_on_your_comment":
                return <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
            case "comment_pinned":
                return <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
            case "post_removed_by_admin":
            case "account_banned":
                return <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
            default:
                return <svg className="w-5 h-5 text-foreground-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">
                    Notifications {unreadCount > 0 && <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full ml-1 align-middle">{unreadCount}</span>}
                </h1>
                <div className="flex gap-4">
                    <button onClick={markAllAsRead} className="text-sm text-foreground hover:text-brand transition-colors cursor-pointer disabled:opacity-50" disabled={unreadCount === 0}>
                        Mark all as read
                    </button>
                    <button onClick={clearAll} className="text-sm text-red-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50" disabled={notifications.length === 0}>
                        Clear all
                    </button>
                </div>
            </div>

            <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
                {(["All", "Unread", "Likes", "Comments", "Mentions", "System"] as FilterTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                            activeTab === tab
                                ? "bg-foreground text-background"
                                : "bg-surface border border-border-subtle text-foreground-muted hover:text-foreground"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {filteredNotifications.length === 0 ? (
                <Card padding="py-16" className="text-center flex flex-col items-center justify-center">
                    <svg className="w-16 h-16 text-border-subtle mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <h3 className="text-lg font-medium text-foreground">No notifications here</h3>
                    <p className="text-sm text-foreground-muted mt-1">
                        {activeTab === "All" 
                            ? "When you get notifications, they'll show up here."
                            : `You don't have any ${activeTab.toLowerCase()} notifications.`}
                    </p>
                </Card>
            ) : (
                <Card padding="p-0" className="overflow-hidden">
                    <div className="divide-y divide-border-subtle">
                        {filteredNotifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left p-4 sm:p-5 flex gap-4 hover:bg-surface-hover transition-colors cursor-pointer relative ${!n.read ? 'bg-brand/5' : ''}`}
                            >
                                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand"></div>}
                                <div className="flex-shrink-0 mt-1">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-foreground">
                                        <span className="font-semibold">{n.actorUsername || "System"}</span> {n.message.replace(`${n.actorUsername} ` || '', '')}
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
                                <div className="flex-shrink-0 text-sm text-foreground-muted whitespace-nowrap">
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
