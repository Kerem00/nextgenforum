import { Link, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
    const { user, logout } = useAuth();

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
