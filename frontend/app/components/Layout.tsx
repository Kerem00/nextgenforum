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
    const [isScrolled, setIsScrolled] = useState(false);
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
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setIsDark(true);
            }
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 8);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleTheme = () => {
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
    };

    const NavLink = ({ to, children, className = "" }: { to: string; children: React.ReactNode; className?: string }) => {
        const isActive = location.pathname === to || (to === "/" && location.pathname === "/");
        return (
            <Link
                to={to}
                className={`relative text-sm font-medium transition-all duration-300 ${isActive
                    ? "text-brand"
                    : "text-foreground-muted hover:text-foreground"
                } ${className}`}
            >
                {children}
                {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-brand to-brand/50" style={{ animation: "scaleIn 0.3s ease-out" }} />
                )}
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* ─── HEADER ─── */}
            <header className={`sticky top-0 z-50 w-full transition-all duration-500 ${isScrolled
                ? "glass-surface shadow-lg shadow-black/5"
                : "bg-transparent border-b border-transparent"
            }`}>
                {/* Gradient line at the very top */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

                <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-1 group flex-shrink-0">
                        <span className="text-xl font-bold tracking-tight gradient-text">NextGen</span>
                        <span className="text-xl font-medium text-foreground-muted group-hover:text-foreground transition-colors duration-300">Forum</span>
                    </Link>

                    {/* Desktop Search */}
                    <form action="/" method="GET" className="hidden md:flex flex-1 max-w-md mx-6">
                        <div className="relative w-full group/search">
                            <input
                                type="text"
                                name="search"
                                placeholder="Search discussions..."
                                className="w-full input-premium rounded-full py-2 pl-10 pr-4 text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within/search:text-brand transition-colors duration-300">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>
                        </div>
                    </form>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-5 flex-shrink-0">
                        <NavLink to="/">Home</NavLink>

                        <button
                            onClick={toggleTheme}
                            className="relative text-foreground-muted hover:text-brand transition-all duration-300 p-2 cursor-pointer flex items-center justify-center h-9 w-9 rounded-xl hover:bg-surface-hover group/theme"
                            aria-label="Toggle theme"
                        >
                            <div className={`transition-transform duration-500 ${isDark ? "rotate-0" : "rotate-180"}`}>
                                {isDark ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                )}
                            </div>
                        </button>

                        {user ? (
                            <>
                                <Link to="/notifications" className="relative text-sm font-medium text-foreground-muted hover:text-brand transition-all duration-300 flex items-center gap-1.5 p-2 rounded-xl hover:bg-surface-hover" title="Notifications">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand to-purple-500 text-[10px] font-bold text-white shadow-lg shadow-brand/30 animate-[scaleIn_0.3s_ease-out]">
                                            {unreadCount}
                                        </span>
                                    )}
                                </Link>
                                <NavLink to={`/users/${user.id}`}>Profile</NavLink>
                                {isAdmin(user) && (
                                    <Link to="/admin" className="text-sm font-medium text-foreground-muted hover:text-brand transition-all duration-300 flex items-center gap-1.5">
                                        Admin
                                        {pendingCount > 0 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/30 animate-[scaleIn_0.3s_ease-out]">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                <div className="w-px h-5 bg-border-subtle mx-1"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm shadow-brand/20">
                                        {user.username.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-foreground-muted">
                                        {user.username}
                                        {isAdmin(user) && (
                                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                Admin
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors cursor-pointer hover:bg-red-500/10 px-3 py-1.5 rounded-lg"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/login">Log in</NavLink>
                                <Link to="/register" className="btn-primary inline-flex items-center text-sm px-5 py-2 rounded-full">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile Menu Toggle & Actions */}
                    <div className="flex md:hidden items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="text-foreground-muted hover:text-brand transition-all duration-300 p-2 cursor-pointer h-9 w-9 rounded-xl flex items-center justify-center hover:bg-surface-hover"
                        >
                            <div className={`transition-transform duration-500 ${isDark ? "rotate-0" : "rotate-180"}`}>
                                {isDark ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                )}
                            </div>
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-foreground-muted hover:text-foreground p-2 rounded-xl hover:bg-surface-hover transition-all"
                        >
                            <div className={`transition-transform duration-300 ${isMobileMenuOpen ? "rotate-90" : ""}`}>
                                {isMobileMenuOpen ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <div className={`md:hidden overflow-hidden transition-all duration-400 ease-in-out ${isMobileMenuOpen ? "max-h-screen border-t border-border-subtle" : "max-h-0 opacity-0"}`}>
                    <div className="glass-surface container mx-auto px-4 py-5 space-y-4">
                        <form action="/" method="GET" className="relative w-full">
                            <input
                                type="text"
                                name="search"
                                placeholder="Search discussions..."
                                className="w-full input-premium rounded-xl py-2.5 pl-10 pr-4 text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>
                        </form>

                        <nav className="flex flex-col gap-1">
                            {[
                                { to: "/", label: "Home" },
                            ].map((item, i) => (
                                <Link key={item.to} to={item.to}
                                    className="text-sm font-medium text-foreground hover:text-brand transition-all p-3 rounded-xl hover:bg-surface-hover"
                                    style={{ animation: `fadeInUp 0.3s ease-out ${i * 50}ms both` }}
                                >{item.label}</Link>
                            ))}

                            {user ? (
                                <>
                                    <Link to="/notifications" className="text-sm font-medium text-foreground hover:text-brand p-3 rounded-xl hover:bg-surface-hover flex items-center justify-between" style={{ animation: "fadeInUp 0.3s ease-out 100ms both" }}>
                                        Notifications
                                        {unreadCount > 0 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand to-purple-500 text-[10px] font-bold text-white">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link to={`/users/${user.id}`} className="text-sm font-medium text-foreground hover:text-brand p-3 rounded-xl hover:bg-surface-hover" style={{ animation: "fadeInUp 0.3s ease-out 150ms both" }}>Profile</Link>
                                    {isAdmin(user) && (
                                        <Link to="/admin" className="text-sm font-medium text-red-400 hover:text-red-300 p-3 rounded-xl hover:bg-red-500/10 flex items-center justify-between" style={{ animation: "fadeInUp 0.3s ease-out 200ms both" }}>
                                            Admin Panel
                                            {pendingCount > 0 && (
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </Link>
                                    )}
                                    <div className="h-px bg-border-subtle my-2" />
                                    <button onClick={logout} className="text-left text-sm font-medium text-red-400 p-3 rounded-xl hover:bg-red-500/10 cursor-pointer" style={{ animation: "fadeInUp 0.3s ease-out 250ms both" }}>Logout ({user.username})</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-sm font-medium text-foreground p-3 rounded-xl hover:bg-surface-hover" style={{ animation: "fadeInUp 0.3s ease-out 100ms both" }}>Log in</Link>
                                    <Link to="/register" className="btn-primary text-center text-sm mt-2 py-2.5 rounded-xl" style={{ animation: "fadeInUp 0.3s ease-out 150ms both" }}>Sign up</Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            {/* ─── MAIN ─── */}
            <main className="flex-1 container mx-auto px-4 py-8">
                <Outlet />
            </main>

            {/* ─── FOOTER ─── */}
            <footer className="relative border-t border-border-subtle mt-auto overflow-hidden">
                {/* Gradient divider */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />

                <div className="glass-surface py-12">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 text-center md:text-left">
                            <div>
                                <div className="flex items-center gap-1 justify-center md:justify-start">
                                    <span className="text-xl font-bold tracking-tight gradient-text">NextGen</span>
                                    <span className="text-xl font-medium text-foreground-muted">Forum</span>
                                </div>
                                <p className="mt-3 text-sm text-foreground-muted max-w-xs mx-auto md:mx-0 leading-relaxed">
                                    A modern, fast, and secure platform for vibrant community discussions. Share ideas, learn together, and connect.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Navigate</h3>
                                <ul className="space-y-2.5 text-sm text-foreground-muted">
                                    <li><Link to="/" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Home</Link></li>
                                    <li><Link to="/register" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Sign up</Link></li>
                                    <li><Link to="/login" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Log in</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Legal</h3>
                                <ul className="space-y-2.5 text-sm text-foreground-muted">
                                    <li><a href="#" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Terms of Service</a></li>
                                    <li><a href="#" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Privacy Policy</a></li>
                                    <li><a href="#" className="hover:text-brand transition-all duration-300 inline-flex items-center gap-1.5 group"><span className="w-0 group-hover:w-2 h-px bg-brand transition-all duration-300"></span>Cookie Policy</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="pt-8 border-t border-border-subtle text-center">
                            <p className="text-sm text-foreground-muted">
                                © {new Date().getFullYear()} NextGenForum. Crafted with care for communities everywhere.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
