import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { postsClient, usersClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { hashColor } from "../utils/hashColor";
import { isAdmin } from "../utils/permissions";
import { timeAgo } from "../utils/timeAgo";
import { Card } from "../components/ui/Card";
import { ReportDetailsModal } from "../components/ReportDetailsModal";

type Stats = {
    total_posts: number;
    total_comments: number;
    total_users: number;
    posts_today: number;
    top_category: string;
};

type AdminUser = {
    id: number;
    username: string;
    email: string;
    role: string;
    is_banned: boolean;
    created_at: string;
};

type Post = {
    id: number;
    title: string;
    content: string;
    category: string;
    owner_id: number;
    created_at: string;
    owner: { username: string };
    likes: any[];
    comment_count: number;
    ai_assist?: { is_toxic?: boolean; title_suggestions?: string[]; suggested_category?: string } | null;
};

export type AdminReport = {
    id: number;
    entity_type: string;
    entity_id: number;
    reason: string;
    context: string | null;
    status: string;
    created_at: string;
};

export type AdminLog = {
    id: number;
    action_type: string;
    entity_type: string | null;
    entity_id: number | null;
    moderator_id: number | null;
    category: string;
    details: string | null;
    created_at: string;
    moderator?: { username: string };
};

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activePage, setActivePage] = useState<"overview" | "users" | "posts" | "moderation" | "automod" | "logs" | "approval_queue">("overview");

    // Overview state
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Users state
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearch, setUserSearch] = useState("");

    // Posts state
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

    // Reports state
    const [reports, setReports] = useState<AdminReport[]>([]);
    const [reportSearch, setReportSearch] = useState("");
    const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

    // Logs state
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [logTab, setLogTab] = useState<"AutoMod" | "Moderation">("Moderation");

    // Approval Queue state
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const [pendingPostsLoading, setPendingPostsLoading] = useState(true);
    const [editingPendingPost, setEditingPendingPost] = useState<Post | null>(null);
    const [pendingEditForm, setPendingEditForm] = useState({ title: '', category: '', content: '' });

    useEffect(() => {
        if (user && !isAdmin(user)) {
            navigate("/");
        }
    }, [user, navigate]);

    useEffect(() => {
        if (activePage === "overview" && !stats) {
            setStatsLoading(true);
            postsClient.get("/admin/stats")
                .then(res => setStats(res.data))
                .catch(err => console.error("Failed to fetch stats", err))
                .finally(() => setStatsLoading(false));
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === "users" && users.length === 0) {
            setUsersLoading(true);
            usersClient.get("/admin/users")
                .then(res => setUsers(res.data))
                .catch(err => console.error("Failed to fetch users", err))
                .finally(() => setUsersLoading(false));
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === "posts" && posts.length === 0) {
            setPostsLoading(true);
            postsClient.get("/posts")
                .then(res => setPosts(res.data))
                .catch(err => console.error("Failed to fetch posts", err))
                .finally(() => setPostsLoading(false));
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === "moderation") {
            postsClient.get("/admin/reports")
                .then(res => setReports(res.data))
                .catch(err => console.error("Failed to fetch reports", err));
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === "logs") {
            postsClient.get("/admin/logs")
                .then(res => setLogs(res.data))
                .catch(err => console.error("Failed to fetch logs", err));
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === "approval_queue") {
            setPendingPostsLoading(true);
            postsClient.get("/admin/pending_posts")
                .then(res => setPendingPosts(res.data))
                .catch(err => console.error("Failed to fetch pending posts", err))
                .finally(() => setPendingPostsLoading(false));
        }
    }, [activePage]);

    const handleApprovePendingPost = async (postId: number) => {
        try {
            await postsClient.post(`/admin/posts/${postId}/approve`);
            setPendingPosts(pendingPosts.filter(p => p.id !== postId));
        } catch (err) {
            console.error("Failed to approve post", err);
        }
    };

    const handleDenyPendingPost = async (postId: number) => {
        try {
            await postsClient.post(`/admin/posts/${postId}/deny`);
            setPendingPosts(pendingPosts.filter(p => p.id !== postId));
        } catch (err) {
            console.error("Failed to deny post", err);
        }
    };

    const handleSavePendingEdit = async () => {
        if (!editingPendingPost) return;
        try {
            const res = await postsClient.put(`/posts/${editingPendingPost.id}`, pendingEditForm);
            setPendingPosts(pendingPosts.map(p => p.id === editingPendingPost.id ? { ...p, ...res.data } : p));
            setEditingPendingPost(null);
        } catch (err) {
            console.error("Failed to edit post", err);
        }
    };


    const handleToggleBan = async (userId: number) => {
        try {
            const res = await usersClient.post(`/admin/users/${userId}/ban`);
            setUsers(users.map(u => u.id === userId ? { ...u, is_banned: res.data.is_banned } : u));
        } catch (err) {
            console.error("Failed to toggle ban", err);
        }
    };

    const handleToggleRole = async (userId: number, currentRole: string) => {
        const newRole = currentRole === "admin" ? "user" : "admin";
        try {
            const res = await usersClient.put(`/admin/users/${userId}/role`, { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: res.data.role } : u));
        } catch (err) {
            console.error("Failed to update role", err);
        }
    };

    const handleDeletePost = async (postId: number) => {
        try {
            await postsClient.delete(`/posts/${postId}`);
            setPosts(posts.filter(p => p.id !== postId));
            setDeletingPostId(null);
        } catch (err) {
            console.error("Failed to delete post", err);
        }
    };

    const handleResolveReport = async (reportId: number) => {
        try {
            await postsClient.post(`/admin/reports/${reportId}/resolve`);
        } catch (err: any) {
            if (err.response?.status !== 404) console.error("Failed to resolve report", err);
        } finally {
            setReports(reports.filter(r => r.id !== reportId));
            setSelectedReport(null);
        }
    };

    const handleBanContent = async (entityType: string, entityId: number, reportId: number) => {
        try {
            if (entityType === "post") {
                await postsClient.delete(`/posts/${entityId}`);
            } else {
                await postsClient.delete(`/comments/${entityId}`);
            }
            try {
                await postsClient.post(`/admin/reports/${reportId}/resolve`);
            } catch (err: any) {
                if (err.response?.status !== 404) console.error("Report resolve threw an error", err);
            }
            setReports(reports.filter(r => r.id !== reportId));
            setSelectedReport(null);
            
            // Refetch logs to immediately show new actions
            if (activePage === "logs") {
                const res = await postsClient.get("/admin/logs");
                setLogs(res.data);
            }
        } catch (err) {
            console.error("Failed to ban content", err);
        }
    };

    if (!user || !isAdmin(user)) {
        return null;
    }

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

    const filteredReports = reports.filter(r =>
        r.id.toString().includes(reportSearch)
    );

    const filteredLogs = logs.filter(l => l.category === logTab);

    const navItems = [
        { key: "overview" as const, label: "Overview", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        )},
        { key: "users" as const, label: "Users", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        )},
        { key: "posts" as const, label: "Posts", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        )},
        { key: "moderation" as const, label: "Reports", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
        )},
        { key: "automod" as const, label: "AutoMod", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>            
        )},
        { key: "approval_queue" as const, label: "Approval Queue", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        )},
        { key: "logs" as const, label: "Logs", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        )},
    ];

    return (
        <div className="flex min-h-[calc(100vh-8rem)] overflow-hidden border-x border-border-subtle w-[100vw] max-w-none relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] -my-8">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex-shrink-0 flex flex-col">
                <div className="px-6 py-6 border-b border-white/10">
                    <h1 className="text-xl font-bold tracking-tight">
                        NextGen<span className="text-gray-400 font-medium">Forum</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActivePage(item.key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activePage === item.key
                                    ? "bg-white/10 text-white border-l-2 border-blue-400"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="px-3 py-4 border-t border-white/10 space-y-2">
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back to Forum
                    </Link>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 bg-background p-8 overflow-auto">
                {activePage === "overview" && (
                    <div className="space-y-8 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Overview</h2>
                            <p className="text-sm text-foreground-muted mt-1">Forum statistics at a glance</p>
                        </div>

                        {statsLoading ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <Card key={i} padding="p-6" className="animate-pulse">
                                        <div className="h-4 w-20 bg-border-subtle rounded mb-3"></div>
                                        <div className="h-8 w-16 bg-border-subtle rounded"></div>
                                    </Card>
                                ))}
                            </div>
                        ) : stats ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatCard label="Total Posts" value={stats.total_posts} icon={
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    } />
                                    <StatCard label="Total Comments" value={stats.total_comments} icon={
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    } />
                                    <StatCard label="Total Users" value={stats.total_users} icon={
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                    } />
                                    <StatCard label="Posts Today" value={stats.posts_today} icon={
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    } />
                                </div>

                                <Card padding="p-6" className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Most Active Category</p>
                                        <p className="text-xl font-bold text-foreground capitalize">{stats.top_category}</p>
                                    </div>
                                </Card>
                            </>
                        ) : null}
                    </div>
                )}

                {activePage === "users" && (
                    <div className="space-y-6 w-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Users</h2>
                                <p className="text-sm text-foreground-muted mt-1">Manage forum members</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-64 px-4 py-2 pl-10 bg-surface border border-border-subtle rounded-lg text-sm text-foreground placeholder-[var(--theme-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>

                        {usersLoading ? (
                            <Card padding="p-0" className="overflow-hidden">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-border-subtle"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-32 bg-border-subtle rounded"></div>
                                            <div className="h-3 w-48 bg-border-subtle rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        ) : (
                            <Card padding="p-0" className="overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-background/50">
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">User</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Email</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Role</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Joined</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Status</th>
                                            <th className="text-right px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u, i) => (
                                            <tr key={u.id} className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover/50 transition-colors ${i % 2 === 0 ? '' : 'bg-background/30'}`}>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full ${hashColor(u.username)} text-white flex items-center justify-center font-bold text-xs uppercase`}>
                                                            {u.username.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-foreground">{u.username}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-foreground-muted">{u.email}</td>
                                                <td className="px-6 py-3">
                                                    {u.role === "admin" ? (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">Admin</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">User</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-foreground-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-3">
                                                    {u.is_banned ? (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Banned</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        {u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleToggleRole(u.id, u.role)}
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                                                                    u.role === "admin"
                                                                        ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20"
                                                                        : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20"
                                                                }`}
                                                            >
                                                                {u.role === "admin" ? "Demote" : "Promote"}
                                                            </button>
                                                        )}
                                                        {u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleToggleBan(u.id)}
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                                                                    u.is_banned
                                                                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20"
                                                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                                                }`}
                                                            >
                                                                {u.is_banned ? "Unban" : "Ban"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-8 text-foreground-muted text-sm">No users found.</div>
                                )}
                            </Card>
                        )}
                    </div>
                )}

                {activePage === "posts" && (
                    <div className="space-y-6 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Posts</h2>
                            <p className="text-sm text-foreground-muted mt-1">Manage forum content</p>
                        </div>

                        {postsLoading ? (
                            <Card padding="p-0" className="overflow-hidden">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 animate-pulse">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-64 bg-border-subtle rounded"></div>
                                            <div className="h-3 w-24 bg-border-subtle rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        ) : (
                            <Card padding="p-0" className="overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-background/50">
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Title</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Category</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Author</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Date</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Likes</th>
                                            <th className="text-right px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.map((p, i) => (
                                            <tr key={p.id} className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover/50 transition-colors ${i % 2 === 0 ? '' : 'bg-background/30'}`}>
                                                <td className="px-6 py-3">
                                                    <Link to={`/posts/${p.id}`} className="font-medium text-foreground hover:text-brand transition-colors">
                                                        {p.title.length > 50 ? p.title.slice(0, 50) + "..." : p.title}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-border-subtle/50 text-foreground-muted capitalize">{p.category}</span>
                                                </td>
                                                <td className="px-6 py-3 text-foreground-muted">{p.owner.username}</td>
                                                <td className="px-6 py-3 text-foreground-muted">{timeAgo(p.created_at)}</td>
                                                <td className="px-6 py-3 text-foreground-muted">{p.likes?.length || 0}</td>
                                                <td className="px-6 py-3 text-right">
                                                    {deletingPostId === p.id ? (
                                                        <div className="inline-flex items-center gap-2">
                                                            <span className="text-xs text-red-500">Sure?</span>
                                                            <button
                                                                onClick={() => handleDeletePost(p.id)}
                                                                className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingPostId(null)}
                                                                className="text-xs font-bold text-foreground-muted hover:text-foreground cursor-pointer"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeletingPostId(p.id)}
                                                            className="text-xs font-medium px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {posts.length === 0 && (
                                    <div className="text-center py-8 text-foreground-muted text-sm">No posts yet.</div>
                                )}
                            </Card>
                        )}
                    </div>
                )}
                {activePage === "moderation" && (
                    <div className="space-y-6 w-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Moderation Reports</h2>
                                <p className="text-sm text-foreground-muted mt-1">Review and act on content flags</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by Report ID..."
                                    value={reportSearch}
                                    onChange={(e) => setReportSearch(e.target.value)}
                                    className="w-64 px-4 py-2 pl-10 bg-surface border border-border-subtle rounded-lg text-sm text-foreground placeholder-[var(--theme-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-brand"
                                />
                                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>

                        <Card padding="p-0" className="overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-subtle bg-background/50">
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Report ID</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Type</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Reason</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.map((r, i) => (
                                        <tr 
                                            key={r.id} 
                                            onClick={() => setSelectedReport(r)}
                                            className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover/50 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-background/30'}`}
                                        >
                                            <td className="px-6 py-3 font-bold text-foreground">#{r.id}</td>
                                            <td className="px-6 py-3 capitalize font-medium text-foreground">
                                                {r.entity_type}
                                            </td>
                                            <td className="px-6 py-3 text-foreground-muted capitalize">
                                                {r.reason.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-3 text-foreground-muted">{timeAgo(r.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredReports.length === 0 && (
                                <div className="text-center py-12 text-foreground-muted flex flex-col items-center">
                                    <svg className="w-12 h-12 mb-4 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <p className="text-sm font-medium">No active reports</p>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
                {activePage === "automod" && (
                    <div className="space-y-6 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Automated Moderator</h2>
                            <p className="text-sm text-foreground-muted mt-1">Configure AI moderation rules</p>
                        </div>
                        <Card padding="py-12" className="flex flex-col items-center justify-center text-center text-foreground-muted">
                            <svg className="w-12 h-12 mb-4 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            <p className="text-sm font-medium">AutoMod configuration is coming soon</p>
                        </Card>
                    </div>
                )}
                {activePage === "logs" && (
                    <div className="space-y-6 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
                            <p className="text-sm text-foreground-muted mt-1">Review system and moderator actions</p>
                        </div>

                        <div className="flex border-b border-border-subtle overflow-x-auto overflow-y-hidden remove-scrollbar pb-1 gap-2">
                            {["AutoMod", "Moderation"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setLogTab(tab as any)}
                                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-300 ${
                                        logTab === tab
                                            ? "bg-brand/10 text-brand outline-none"
                                            : "text-foreground-muted hover:text-foreground hover:bg-surface-hover hover:border-transparent outline-none"
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <Card padding="p-0" className="overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-subtle bg-background/50">
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Log ID</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Type</th>
                                        <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Action</th>
                                        {logTab === "Moderation" ? (
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Moderator</th>
                                        ) : (
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Details</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((l, i) => {
                                        const actionLabel = l.action_type === 'ban' ? 'Removed' : l.action_type === 'resolve_report' ? 'Approved' : l.action_type.replace(/_/g, ' ');
                                        const typeLabel = logTab === "Moderation" ? "Report" : (l.entity_type || 'System');

                                        return (
                                            <tr 
                                                key={l.id} 
                                                className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover/50 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-background/30'}`}
                                                onClick={() => {
                                                    if (l.entity_type) {
                                                        setSelectedReport({
                                                            id: l.id,
                                                            entity_type: l.entity_type,
                                                            entity_id: l.entity_id || 0,
                                                            reason: l.action_type,
                                                            context: l.details,
                                                            status: "resolved",
                                                            created_at: l.created_at
                                                        });
                                                    }
                                                }}
                                            >
                                                <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">#{l.id}</td>
                                                <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-3 capitalize text-teal-500 font-medium whitespace-nowrap">{typeLabel}</td>
                                                <td className="px-6 py-3 text-foreground font-medium capitalize whitespace-nowrap">{actionLabel}</td>
                                                {logTab === "Moderation" ? (
                                                    <td className="px-6 py-3 text-amber-500 font-medium whitespace-nowrap">{l.moderator?.username || 'Unknown'}</td>
                                                ) : (
                                                    <td className="px-6 py-3 text-foreground-muted">{l.details}</td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredLogs.length === 0 && (
                                <div className="text-center py-12 text-foreground-muted">
                                    <p className="text-sm font-medium">No logs found for this category</p>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
                {activePage === "approval_queue" && (
                    <div className="space-y-6 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Approval Queue</h2>
                            <p className="text-sm text-foreground-muted mt-1">Review new posts before they go live</p>
                        </div>
                        {pendingPostsLoading ? (
                            <Card padding="p-0" className="overflow-hidden">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 animate-pulse">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-64 bg-border-subtle rounded"></div>
                                            <div className="h-3 w-24 bg-border-subtle rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        ) : (
                            <Card padding="p-0" className="overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-background/50">
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Title</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Category</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Author</th>
                                            <th className="text-right px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingPosts.map((p, i) => (
                                            <tr key={p.id} className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover/50 transition-colors ${i % 2 === 0 ? '' : 'bg-background/30'}`}>
                                                <td className="px-6 py-3 font-medium text-foreground">{p.title}</td>
                                                <td className="px-6 py-3">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-border-subtle/50 text-foreground-muted capitalize">{p.category}</span>
                                                </td>
                                                <td className="px-6 py-3 text-foreground-muted">{p.owner.username}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button onClick={() => { setEditingPendingPost(p); setPendingEditForm({ title: p.title, category: p.category, content: p.content }); }} className="text-xs font-medium px-3 py-1.5 rounded-md text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors cursor-pointer">Edit</button>
                                                        <button onClick={() => handleApprovePendingPost(p.id)} className="text-xs font-medium px-3 py-1.5 rounded-md text-green-500 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-colors cursor-pointer">Approve</button>
                                                        <button onClick={() => handleDenyPendingPost(p.id)} className="text-xs font-medium px-3 py-1.5 rounded-md text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer">Deny</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {pendingPosts.length === 0 && (
                                    <div className="text-center py-8 text-foreground-muted text-sm">Queue is empty.</div>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </main>
            {editingPendingPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <Card padding="p-6" className="w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">Edit Pending Post</h3>
                            {editingPendingPost.ai_assist?.is_toxic && (
                                <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 font-bold rounded border border-red-500/20">Toxic flag</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-foreground-muted">Title</label>
                            <input className="w-full px-3 py-2 bg-surface text-foreground border border-border-subtle rounded-md" value={pendingEditForm.title} onChange={e => setPendingEditForm({...pendingEditForm, title: e.target.value})} />
                            {editingPendingPost.ai_assist?.title_suggestions && editingPendingPost.ai_assist.title_suggestions.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    <p className="text-xs font-semibold text-brand mb-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                        AI Suggestions
                                    </p>
                                    <div className="flex flex-col gap-1.5">
                                        {editingPendingPost.ai_assist.title_suggestions.map((titleSuggestion, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-brand/5 px-2 py-1.5 rounded border border-brand/10">
                                                <span className="text-xs text-foreground-muted truncate mr-2 font-medium" title={titleSuggestion}>{titleSuggestion}</span>
                                                <button onClick={() => setPendingEditForm({...pendingEditForm, title: titleSuggestion})} className="text-[10px] font-bold bg-brand text-brand-foreground px-2 py-0.5 rounded cursor-pointer shrink-0 hover:bg-brand-hover transition-colors">Use</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-foreground-muted">Category</label>
                            <input className="w-full px-3 py-2 bg-surface text-foreground border border-border-subtle rounded-md" value={pendingEditForm.category} onChange={e => setPendingEditForm({...pendingEditForm, category: e.target.value})} />
                            {editingPendingPost.ai_assist?.suggested_category && (
                                <div className="mt-3 flex items-center justify-between bg-brand/5 px-2 py-1.5 rounded border border-brand/10">
                                    <p className="text-xs text-foreground-muted flex items-center gap-1">
                                        <svg className="w-3 h-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                        <span className="font-semibold text-brand">AI Suggests:</span> 
                                        <span className="font-medium capitalize">{editingPendingPost.ai_assist.suggested_category}</span>
                                    </p>
                                    <button onClick={() => setPendingEditForm({...pendingEditForm, category: editingPendingPost.ai_assist!.suggested_category!})} className="text-[10px] font-bold bg-brand text-brand-foreground px-2 py-0.5 rounded cursor-pointer hover:bg-brand-hover transition-colors">Use</button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-foreground-muted">Content</label>
                            <textarea className="w-full h-32 px-3 py-2 bg-surface text-foreground border border-border-subtle rounded-md" value={pendingEditForm.content} onChange={e => setPendingEditForm({...pendingEditForm, content: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
                            <button onClick={() => setEditingPendingPost(null)} className="px-4 py-2 rounded-md hover:bg-surface-hover text-sm font-medium cursor-pointer">Cancel</button>
                            <button onClick={handleSavePendingEdit} className="px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium cursor-pointer">Save Changes</button>
                        </div>
                    </Card>
                </div>
            )}
            
            {selectedReport && (
                <ReportDetailsModal 
                    report={selectedReport} 
                    onClose={() => setSelectedReport(null)} 
                    onResolve={() => handleResolveReport(selectedReport.id)}
                    onBan={() => handleBanContent(selectedReport.entity_type, selectedReport.entity_id, selectedReport.id)}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <Card padding="p-6" className="flex items-start justify-between">
            <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">{label}</p>
                <p className="text-3xl font-bold text-foreground">{value}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                {icon}
            </div>
        </Card>
    );
}
