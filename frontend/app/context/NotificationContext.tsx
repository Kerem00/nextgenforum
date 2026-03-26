import React, { createContext, useContext, useEffect, useState } from "react";
import type { Notification } from "../types/notifications";
import { useAuth } from "./AuthContext";

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (n: Notification) => void;
    clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load from localStorage on mount or when user changes
    useEffect(() => {
        if (user) {
            const key = `notifications_user_${user.id}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    setNotifications(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse notifications", e);
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }
        } else {
            setNotifications([]);
        }
    }, [user]);

    // Save to localStorage whenever notifications change
    useEffect(() => {
        if (user) {
            const key = `notifications_user_${user.id}`;
            localStorage.setItem(key, JSON.stringify(notifications));
        }
    }, [notifications, user]);

    // Cross-tab and programmatic update listener
    useEffect(() => {
        if (!user) return;
        const handleUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.userId !== user.id) return;
            
            const key = `notifications_user_${user.id}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    setNotifications(JSON.parse(stored));
                } catch (err) {}
            }
        };

        window.addEventListener("local-storage-notifications-update", handleUpdate);
        return () => window.removeEventListener("local-storage-notifications-update", handleUpdate);
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const addNotification = (n: Notification) => {
        setNotifications(prev => {
            const updated = [n, ...prev];
            return updated.slice(0, 50); // Cap at 50
        });
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
