import type { Notification, AdminNotification } from "../types/notifications";
import { buildNotificationMessage, buildAdminNotificationMessage } from "./notificationMessages";

export function sendUserNotification(userId: number, n: Omit<Notification, "id" | "read" | "createdAt" | "message">) {
    const key = `notifications_user_${userId}`;
    const stored = localStorage.getItem(key);
    let notifications: Notification[] = [];
    if (stored) {
        try {
            notifications = JSON.parse(stored);
        } catch (e) {}
    }
    
    const notification: Notification = {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
        message: buildNotificationMessage(n as Omit<Notification, 'message'>)
    };
    
    notifications = [notification, ...notifications].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(notifications));
    
    window.dispatchEvent(new CustomEvent("local-storage-notifications-update", { detail: { userId } }));
}

export function sendAdminNotification(n: Omit<AdminNotification, "id" | "read" | "createdAt" | "message">) {
    const key = `notifications_admin`;
    const stored = localStorage.getItem(key);
    let notifications: AdminNotification[] = [];
    if (stored) {
        try {
            notifications = JSON.parse(stored);
        } catch (e) {}
    }
    
    const notification: AdminNotification = {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
        message: buildAdminNotificationMessage(n as Omit<AdminNotification, 'message'>)
    };
    
    notifications = [notification, ...notifications].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(notifications));
    
    window.dispatchEvent(new Event("local-storage-admin-notifications-update"));
}

export function extractMentions(text: string): string[] {
    const regex = /@(\w+)/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))]; // return unique usernames
}

export function hasBlockquote(text: string): boolean {
    return /^>/m.test(text);
}
