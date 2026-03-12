import { Link, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

export default function Layout() {
    const { user, logout } = useAuth();
    const [isDark, setIsDark] = useState(false);

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

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold tracking-tight text-foreground flex-shrink-0">
                        NextGen<span className="text-foreground-muted font-medium">Forum</span>
                    </Link>

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

                    <nav className="flex items-center gap-6 flex-shrink-0">
                        <Link to="/" className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors">
                            Home
                        </Link>
                        
                        <button 
                            onClick={toggleTheme}
                            className="text-foreground-muted hover:text-brand transition-colors p-1 cursor-pointer flex items-center justify-center h-8 w-8 rounded-full hover:bg-surface-hover"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                            )}
                        </button>

                        {user ? (
                            <>
                                <Link to={`/users/${user.id}`} className="text-sm font-medium text-foreground hover:text-foreground-muted transition-colors">
                                    Profile
                                </Link>
                                <div className="w-px h-4 bg-border-subtle mx-2"></div>
                                <span className="text-sm font-medium text-foreground-muted">
                                    {user.username}
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
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <Outlet />
            </main>

            <footer className="border-t border-border-subtle bg-surface py-6 mt-auto">
                <div className="container mx-auto px-4 text-center text-sm text-foreground-muted">
                    © {new Date().getFullYear()} NextGenForum. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
