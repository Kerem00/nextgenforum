import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { postsClient, usersClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { hashColor } from "../utils/hashColor";

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
};

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const years = Math.floor(diffInSeconds / 31536000);
    if (years > 0) return `${years}y ago`;
    const months = Math.floor(diffInSeconds / 2592000);
    if (months > 0) return `${months}mo ago`;
    const days = Math.floor(diffInSeconds / 86400);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
}

export default function Admin() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activePage, setActivePage] = useState<"overview" | "users" | "posts">("overview");

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

    useEffect(() => {
        if (user && user.username !== "admin") {
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

    const handleToggleBan = async (userId: number) => {
        try {
            const res = await usersClient.post(`/admin/users/${userId}/ban`);
            setUsers(users.map(u => u.id === userId ? { ...u, is_banned: res.data.is_banned } : u));
        } catch (err) {
            console.error("Failed to toggle ban", err);
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

    if (!user || user.username !== "admin") {
        return null;
    }

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

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
    ];

    return (
        <div className="flex min-h-[calc(100vh-8rem)] -mx-4 -my-8 rounded-xl overflow-hidden border border-border-subtle">
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

                <div className="px-3 py-4 border-t border-white/10">
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
                    <div className="space-y-8 max-w-5xl">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Overview</h2>
                            <p className="text-sm text-foreground-muted mt-1">Forum statistics at a glance</p>
                        </div>

                        {statsLoading ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-surface border border-border-subtle rounded-xl p-6 animate-pulse">
                                        <div className="h-4 w-20 bg-border-subtle rounded mb-3"></div>
                                        <div className="h-8 w-16 bg-border-subtle rounded"></div>
                                    </div>
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

                                <div className="bg-surface border border-border-subtle rounded-xl p-6 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Most Active Category</p>
                                        <p className="text-xl font-bold text-foreground capitalize">{stats.top_category}</p>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {activePage === "users" && (
                    <div className="space-y-6 max-w-5xl">
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
                            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-border-subtle"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-32 bg-border-subtle rounded"></div>
                                            <div className="h-3 w-48 bg-border-subtle rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-subtle bg-background/50">
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">User</th>
                                            <th className="text-left px-6 py-3 font-medium text-foreground-muted text-xs uppercase tracking-wider">Email</th>
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
                                                <td className="px-6 py-3 text-foreground-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-3">
                                                    {u.is_banned ? (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Banned</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {u.username !== "admin" && (
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
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-8 text-foreground-muted text-sm">No users found.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activePage === "posts" && (
                    <div className="space-y-6 max-w-5xl">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Posts</h2>
                            <p className="text-sm text-foreground-muted mt-1">Manage forum content</p>
                        </div>

                        {postsLoading ? (
                            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 animate-pulse">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-64 bg-border-subtle rounded"></div>
                                            <div className="h-3 w-24 bg-border-subtle rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
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
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-surface border border-border-subtle rounded-xl p-6 flex items-start justify-between">
            <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">{label}</p>
                <p className="text-3xl font-bold text-foreground">{value}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                {icon}
            </div>
        </div>
    );
}
