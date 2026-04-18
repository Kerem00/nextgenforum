import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { usersClient } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!email.trim() || !username.trim() || !password.trim()) {
            setError("All fields are required.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            // 1. Register the user
            await usersClient.post("/users", {
                email,
                username: username,
                password
            });

            // 2. Automatically login after successful registration
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const res = await usersClient.post("/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token } = res.data;
            login(access_token, null);
            navigate("/");

        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.detail) {
                // FastAPI sometimes returns array of loc/msg for validation errors
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    setError(detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', '));
                } else {
                    setError(detail);
                }
            } else {
                setError("Registration failed");
            }
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
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
                        <p className="text-foreground-muted mt-2 text-sm">Join NextGenForum and be part of the community</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium animate-[shake_0.5s_ease-in-out]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-premium"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-premium"
                                placeholder="Choose a username"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-premium"
                                placeholder="Min. 6 characters"
                            />
                            {password.length > 0 && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-border-subtle overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${
                                            password.length < 6 ? "w-1/4 bg-red-500" :
                                            password.length < 10 ? "w-2/4 bg-yellow-500" :
                                            password.length < 14 ? "w-3/4 bg-blue-500" :
                                            "w-full bg-green-500"
                                        }`} />
                                    </div>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                        password.length < 6 ? "text-red-400" :
                                        password.length < 10 ? "text-yellow-500" :
                                        password.length < 14 ? "text-blue-400" :
                                        "text-green-400"
                                    }`}>
                                        {password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : password.length < 14 ? "Good" : "Strong"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                                    Creating account...
                                </span>
                            ) : "Sign up"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-foreground-muted">
                            Already have an account? <Link to="/login" className="text-brand font-semibold hover:text-brand-hover transition-colors">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
