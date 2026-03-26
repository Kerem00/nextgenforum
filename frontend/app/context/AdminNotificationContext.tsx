import React, { createContext, useContext, useEffect, useState } from "react";
import type { AdminNotification } from "../types/notifications";
import { useAuth } from "./AuthContext";
import { isAdmin } from "../utils/permissions";

type AdminNotificationContextType = {
    notifications: AdminNotification[];
    unreadCount: number;
    pendingCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (n: AdminNotification) => void;
    clearAll: () => void;
};

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    useEffect(() => {
        if (user && isAdmin(user)) {
            const key = `notifications_admin`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    setNotifications(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse admin notifications", e);
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }
        } else {
            setNotifications([]);
        }
    }, [user]);

    useEffect(() => {
        if (user && isAdmin(user)) {
            const key = `notifications_admin`;
            localStorage.setItem(key, JSON.stringify(notifications));
        }
    }, [notifications, user]);

    useEffect(() => {
        if (!user || !isAdmin(user)) return;
        const handleUpdate = () => {
            const key = `notifications_admin`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    setNotifications(JSON.parse(stored));
                } catch (err) {}
            }
        };

        window.addEventListener("local-storage-admin-notifications-update", handleUpdate);
        return () => window.removeEventListener("local-storage-admin-notifications-update", handleUpdate);
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Pending count specifically for flagged_content
    const pendingCount = notifications.filter(n => n.type === "flagged_content" && !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const addNotification = (n: AdminNotification) => {
        setNotifications(prev => {
            const updated = [n, ...prev];
            return updated.slice(0, 50); // Cap at 50
        });
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <AdminNotificationContext.Provider value={{ notifications, unreadCount, pendingCount, markAsRead, markAllAsRead, addNotification, clearAll }}>
            {children}
        </AdminNotificationContext.Provider>
    );
}

export function useAdminNotifications() {
    const context = useContext(AdminNotificationContext);
    if (context === undefined) {
        throw new Error("useAdminNotifications must be used within an AdminNotificationProvider");
    }
    return context;
}
