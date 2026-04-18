import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { usersClient } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!email.trim() || !password.trim()) {
            setError("Both email and password are required.");
            return;
        }

        setLoading(true);

        // FastAPI OAuth2PasswordRequestForm needs application/x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        try {
            const res = await usersClient.post("/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token } = res.data;
            // Login with empty userId, AuthContext will parse it or set to null
            await login(access_token, null);
            navigate("/");
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center" style={{ animation: "fadeInUp 0.5s ease-out both" }}>
            <div className="w-full max-w-md">
                <div className="glass-card glow-border p-8 md:p-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg shadow-brand/20">
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                        <p className="text-foreground-muted mt-2 text-sm">Enter your credentials to access your account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium animate-[shake_0.5s_ease-in-out]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Email / Username</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-premium"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-premium"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                                    Signing in...
                                </span>
                            ) : "Sign in"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-foreground-muted">
                            Don't have an account? <Link to="/register" className="text-brand font-semibold hover:text-brand-hover transition-colors">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
