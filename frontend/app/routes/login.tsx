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
            login(access_token, null);
            navigate("/");
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-12 bg-surface p-8 rounded-2xl shadow-sm border border-border-subtle">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-foreground-muted mt-2">Enter your credentials to access your account</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email / Username</label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-foreground"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-foreground"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-brand text-surface font-medium shadow hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-foreground-muted">
                Don't have an account? <Link to="/register" className="text-brand font-medium hover:underline">Sign up</Link>
            </p>
        </div>
    );
}
