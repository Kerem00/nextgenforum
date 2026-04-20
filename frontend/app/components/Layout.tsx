import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { useAdminNotifications } from "../context/AdminNotificationContext";
import { useNotifications } from "../context/NotificationContext";
import { isAdmin } from "../utils/permissions";

export default function Layout() {
    const { user, logout } = useAuth();
    const { pendingCount } = useAdminNotifications();
    const { unreadCount } = useNotifications();
    const [isDark, setIsDark] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            setIsDark(true);
        } else if (savedTheme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            setIsDark(false);
        } else {
            // Respect prefers-color-scheme
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setIsDark(true);
            }
        }
    }, []);

    const toggleTheme = () => {
        const savedAccent = localStorage.getItem("ngf_accent_color");
        if (isDark) {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
            localStorage.setItem("theme", "light");
            setIsDark(false);
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
            setIsDark(true);
        }
        // Re-apply accent color so the correct light/dark variant is used
        if (savedAccent) {
            import("../routes/edit-profile").then(m => {
                m.applyAccentColor(savedAccent as any);
            });
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md relative">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
                    <Link to="/" className="text-xl font-bold tracking-tight text-foreground flex-shrink-0">
                        NextGen<span className="text-foreground-muted font-medium">Forum</span>
                    </Link>

                    {/* Desktop Search */}
                    <form action="/" method="GET" className="hidden md:flex flex-1 max-w-md mx-6">
                        <div className="relative w-full">
                            <input
                                type="text"
                                name="search"
                                placeholder="Search discussions..."
                                className="w-full bg-background border border-border-subtle rounded-full py-1.5 pl-4 pr-10 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-foreground placeholder-[var(--theme-foreground-muted)]"
                            />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-brand cursor-pointer">
                                🔍
                            </button>
                        </div>
                    </form>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
                        <Link to="/" className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors">
                            Home
                        </Link>

                        <button
                            onClick={toggleTheme}
                            className="text-foreground-muted hover:text-brand transition-colors p-1 cursor-pointer flex items-center justify-center h-8 w-8 rounded-full hover:bg-surface-hover"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                            )}
                        </button>

                        {user ? (
                            <>
                                <Link
                                    to="/bookmarks"
                                    className="text-foreground-muted hover:text-brand transition-colors p-1 cursor-pointer flex items-center justify-center h-8 w-8 rounded-full hover:bg-surface-hover"
                                    title="Bookmarks"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </Link>
                                <Link to="/notifications" className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors flex items-center gap-1.5" title="Notifications">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    {unreadCount > 0 && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-surface">
                                            {unreadCount}
                                        </span>
                                    )}
                                </Link>
                                <Link to={`/users/${user.id}`} className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors">
                                    Profile
                                </Link>
                                {isAdmin(user) && (
                                    <Link to="/admin" className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors flex items-center gap-1.5">
                                        Admin Panel
                                        {pendingCount > 0 && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                <div className="w-px h-4 bg-border-subtle mx-2"></div>
                                <span className="text-sm font-medium text-foreground-muted flex items-center gap-1.5">
                                    {user.username}
                                    {isAdmin(user) && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                            Admin
                                        </span>
                                    )}
                                </span>
                                <button
                                    onClick={logout}
                                    className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors">
                                    Log in
                                </Link>
                                <Link to="/register" className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-surface shadow transition-colors hover:bg-brand-hover">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile Menu Toggle & Actions */}
                    <div className="flex md:hidden items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="text-foreground-muted hover:text-brand transition-colors p-1 cursor-pointer h-8 w-8 rounded-full flex items-center justify-center"
                        >
                            {isDark ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                            )}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-foreground-muted hover:text-foreground p-1"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            ) : (
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-surface ${isMobileMenuOpen ? "max-h-screen border-t border-border-subtle" : "max-h-0 opacity-0"}`}>
                    <div className="container mx-auto px-4 py-4 space-y-4">
                        <form action="/" method="GET" className="relative w-full">
                            <input
                                type="text"
                                name="search"
                                placeholder="Search discussions..."
                                className="w-full bg-background border border-border-subtle rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-brand"
                            />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-brand">
                                🔍
                            </button>
                        </form>
                        
                        <nav className="flex flex-col gap-3">
                            <Link to="/" className="text-sm font-medium text-foreground hover:text-brand transition-colors p-2 rounded-md hover:bg-surface-hover">Home</Link>
                            
                            {user ? (
                                <>
                                    <Link
                                        to="/bookmarks"
                                        className="text-sm font-medium text-foreground hover:text-brand p-2 rounded-md hover:bg-surface-hover flex items-center gap-3"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                        Bookmarks
                                    </Link>
                                    <Link to="/notifications" className="text-sm font-medium text-foreground hover:text-brand p-2 rounded-md hover:bg-surface-hover flex items-center justify-between">
                                        Notifications
                                        {unreadCount > 0 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-surface">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link to={`/users/${user.id}`} className="text-sm font-medium text-foreground hover:text-brand p-2 rounded-md hover:bg-surface-hover">Profile</Link>
                                    {isAdmin(user) && (
                                        <Link to="/admin" className="text-sm font-medium text-red-500 hover:text-red-600 p-2 rounded-md hover:bg-red-500/10 flex items-center justify-between">
                                            Admin Panel
                                            {pendingCount > 0 && (
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </Link>
                                    )}
                                    <button onClick={logout} className="text-left text-sm font-medium text-red-500 p-2 rounded-md hover:bg-red-500/10 cursor-pointer">Logout ({user.username})</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-sm font-medium text-foreground p-2 rounded-md hover:bg-surface-hover">Log in</Link>
                                    <Link to="/register" className="text-sm font-medium text-brand p-2 rounded-md hover:bg-brand/10">Sign up</Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <Outlet />
            </main>

            <footer className="border-t border-border-subtle bg-surface py-8 mt-auto">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
                        <div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                NextGen<span className="text-brand font-medium">Forum</span>
                            </span>
                            <p className="mt-2 text-sm text-foreground-muted max-w-xs mx-auto md:mx-0">
                                A modern, fast, and secure place to host and participate in amazing discussions.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground mb-3">Links</h3>
                            <ul className="space-y-2 text-sm text-foreground-muted">
                                <li><Link to="/" className="hover:text-brand transition-colors">Home</Link></li>
                                <li><Link to="/register" className="hover:text-brand transition-colors">Sign up</Link></li>
                                <li><Link to="/login" className="hover:text-brand transition-colors">Log in</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
                            <ul className="space-y-2 text-sm text-foreground-muted">
                                <li><Link to="/terms" className="hover:text-brand transition-all duration-150 hover:translate-x-1 inline-block">Terms of Service</Link></li>
                                <li><Link to="/privacy" className="hover:text-brand transition-all duration-150 hover:translate-x-1 inline-block">Privacy Policy</Link></li>
                                <li><Link to="/cookies" className="hover:text-brand transition-all duration-150 hover:translate-x-1 inline-block">Cookie Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-border-subtle text-center text-sm text-foreground-muted">
                        © {new Date().getFullYear()} NextGenForum. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
