import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useNotifications } from "../context/NotificationContext";
import { useAdminNotifications } from "../context/AdminNotificationContext";
import type { Notification, AdminNotification } from "../types/notifications";
import { timeAgo } from "../utils/timeAgo";

type NotificationPanelProps = {
    isAdminPanel?: boolean;
    onClose: () => void;
};

export function NotificationPanel({ isAdminPanel = false, onClose }: NotificationPanelProps) {
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);

    const userCtx = useNotifications();
    const adminCtx = useAdminNotifications();

    const notifications = isAdminPanel ? adminCtx.notifications : userCtx.notifications;
    const unreadCount = isAdminPanel ? adminCtx.unreadCount : userCtx.unreadCount;
    const markAsRead = isAdminPanel ? adminCtx.markAsRead : userCtx.markAsRead;
    const markAllAsRead = isAdminPanel ? adminCtx.markAllAsRead : userCtx.markAllAsRead;
    const clearAll = isAdminPanel ? adminCtx.clearAll : userCtx.clearAll;

    // Handle outside click to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    const handleNotificationClick = (n: Notification | AdminNotification) => {
        markAsRead(n.id);
        onClose();

        if (isAdminPanel) {
            const an = n as AdminNotification;
            if (an.type === "new_user_registered" || an.type === "user_banned") {
                navigate("/admin?tab=users");
            } else if (an.type === "new_report" || an.type === "flagged_content") {
                navigate("/admin?tab=moderation");
            } else {
                navigate("/admin");
            }
        } else {
            const un = n as Notification;
            if (un.postId) {
                navigate(`/posts/${un.postId}`);
            }
        }
    };

    const getUserIcon = (type: string) => {
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

    const getAdminIcon = (type: string) => {
        switch (type) {
            case "new_report":
                return <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>;
            case "new_user_registered":
                return <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>;
            case "flagged_content":
                return <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
            case "user_banned":
                return <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
            default:
                return <svg className="w-5 h-5 text-foreground-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>;
        }
    };

    return (
        <div ref={panelRef} className="absolute top-14 right-4 sm:right-0 w-80 sm:w-96 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[480px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface/50">
                <h3 className="font-bold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-brand font-medium hover:underline cursor-pointer">
                        Mark all as read
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="px-4 py-12 text-center text-foreground-muted flex flex-col items-center">
                        <svg className="w-10 h-10 mb-3 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        <p className="text-sm">You're all caught up</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-subtle">
                        {notifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-hover transition-colors cursor-pointer relative ${!n.read ? 'bg-brand/5' : ''}`}
                            >
                                {!n.read && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand"></div>}
                                <div className="flex-shrink-0 mt-0.5">
                                    {isAdminPanel ? getAdminIcon(n.type) : getUserIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground">
                                        <span className="font-semibold">{n.actorUsername || (isAdminPanel ? "System" : "Someone")}</span> {n.message.replace(`${n.actorUsername} `, '').replace(`${n.actorUsername || "A user"} `, '')}
                                    </p>
                                    {!isAdminPanel && (n as Notification).postTitle && (
                                        <p className="text-xs text-foreground-muted italic truncate mt-0.5">
                                            {(n as Notification).postTitle}
                                        </p>
                                    )}
                                    {!isAdminPanel && (n as Notification).commentPreview && (
                                        <p className="text-xs text-foreground-muted italic truncate mt-0.5">
                                            {(n as Notification).commentPreview}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-xs text-foreground-muted whitespace-nowrap">
                                    {timeAgo(n.createdAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-border-subtle bg-background px-4 py-2.5 flex items-center justify-between">
                <button onClick={() => { clearAll(); onClose(); }} className="text-xs text-foreground-muted hover:text-red-500 transition-colors cursor-pointer">
                    Clear all notifications
                </button>
                {!isAdminPanel && (
                    <Link to="/notifications" onClick={onClose} className="text-xs text-brand hover:underline font-medium">
                        See all →
                    </Link>
                )}
            </div>
        </div>
    );
}
