import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";

type Post = {
    id: number;
    title: string;
    content: string;
    category: string;
    owner_id: number;
    likes: any[];
};

type Comment = {
    id: number;
    content: string;
    post_id: number;
    post_title: string;
    owner_id: number;
};

type UserProfile = {
    id: number;
    username: string;
    created_at: string;
    posts: Post[];
    comments: Comment[];
};

export default function Profile() {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();

    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await postsClient.get(`/users/${userId}`);
                setProfileData(res.data);
            } catch (err) {
                console.error("Failed to fetch profile", err);
                setError("Could not load user profile.");
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        }
    }, [userId]);

    const joinedDate = useMemo(() => {
        if (!profileData?.created_at) return "";
        const date = new Date(profileData.created_at);
        return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }, [profileData?.created_at]);

    const totalLikes = useMemo(() => {
        if (!profileData?.posts) return 0;
        return profileData.posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    }, [profileData?.posts]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 py-12">
                <div className="glass-card overflow-hidden" style={{ animation: "fadeIn 0.5s ease-out" }}>
                    <div className="h-[140px] w-full skeleton-shimmer" />
                    <div className="px-8 pb-8 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full skeleton-shimmer -mt-10 mb-4 ring-4 ring-background" />
                        <div className="w-40 h-7 skeleton-shimmer rounded-lg mb-2" />
                        <div className="w-28 h-4 skeleton-shimmer rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <Card padding="py-12" className="text-center mt-8 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground">{error || "User not found"}</h2>
                <Link to="/" className="text-brand hover:underline mt-4 inline-block">Return to home</Link>
            </Card>
        );
    }

    const isCurrentUser = currentUser?.id === Number(userId);

    return (
        <div className="max-w-4xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.4s ease-out both" }}>
            {/* Header Section */}
            <div className="glass-card overflow-hidden">
                {/* Animated gradient banner */}
                <div className="h-[140px] w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand via-purple-600 to-indigo-600" style={{ backgroundSize: "200% 200%", animation: "gradientShift 6s ease infinite" }} />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.1),transparent_70%)]" />
                </div>

                <div className="px-8 pb-8 relative flex flex-col items-center">
                    <div className="w-22 h-22 rounded-full bg-gradient-to-br from-brand to-purple-600 text-white flex items-center justify-center font-bold text-4xl shadow-xl shadow-brand/30 ring-4 ring-background -mt-11 mb-4 z-10 relative overflow-hidden"
                         style={{ width: '5.5rem', height: '5.5rem' }}>
                        {profileData.username?.charAt(0).toUpperCase()}
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <h1 className="text-3xl font-extrabold text-foreground">{profileData.username}</h1>
                    {joinedDate && (
                        <p className="text-foreground-muted text-sm mt-1.5 mb-2 font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            {joinedDate}
                        </p>
                    )}

                    {isCurrentUser && (
                        <div className="mt-4 flex gap-3">
                            <button className="btn-secondary px-5 py-2.5 text-sm rounded-xl cursor-pointer">
                                Edit Profile
                            </button>
                            <Link to="/notifications" className="btn-ghost px-5 py-2.5 text-sm rounded-xl flex items-center gap-2">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                Notifications
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Bar Section */}
            <div className="glass-card p-6 flex items-center justify-around text-center" style={{ animation: "fadeInUp 0.4s ease-out 100ms both" }}>
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black gradient-text-static mb-1">{profileData.posts?.length || 0}</span>
                    <span className="text-[10px] text-foreground-muted uppercase tracking-[0.15em] font-bold">Posts</span>
                </div>
                <div className="w-px h-12 bg-gradient-to-b from-transparent via-border-subtle to-transparent"></div>
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black gradient-text-static mb-1">{profileData.comments?.length || 0}</span>
                    <span className="text-[10px] text-foreground-muted uppercase tracking-[0.15em] font-bold">Comments</span>
                </div>
                <div className="w-px h-12 bg-gradient-to-b from-transparent via-border-subtle to-transparent"></div>
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black gradient-text-static mb-1">{totalLikes}</span>
                    <span className="text-[10px] text-foreground-muted uppercase tracking-[0.15em] font-bold">Likes <span className="hidden sm:inline">Received</span></span>
                </div>
            </div>

            {/* Grid Section */}
            <div className="grid md:grid-cols-2 gap-6">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-brand to-purple-600" />
                        Activity
                    </h2>
                    {profileData.posts && profileData.posts.length > 0 ? (
                        <div className="space-y-3">
                            {profileData.posts.map((post, i) => (
                                <Link
                                    key={post.id}
                                    to={`/posts/${post.id}`}
                                    className="block"
                                    style={{ animation: `fadeInUp 0.35s ease-out ${i * 60}ms both` }}
                                >
                                    <Card hover accent padding="p-5" className="hover:-translate-y-1 relative">
                                        <div className="mb-2.5">
                                            <span className="badge-brand text-[10px] capitalize">
                                                {post.category || "General"}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground group-hover:text-brand transition-colors duration-300 mb-2 leading-tight">{post.title}</h3>
                                        <p className="text-sm text-foreground-muted line-clamp-2 opacity-80 leading-relaxed">{post.content}</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card padding="py-12 px-4" className="flex flex-col items-center justify-center border-dashed text-foreground-muted text-center">
                            <div className="w-12 h-12 rounded-xl bg-brand/5 flex items-center justify-center mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>
                                <svg className="w-6 h-6 text-brand/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <p className="text-sm font-medium">No posts published yet.</p>
                        </Card>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-brand to-purple-600" />
                        Recent Comments
                    </h2>
                    {profileData.comments && profileData.comments.length > 0 ? (
                        <div className="space-y-3">
                            {profileData.comments.map((comment, i) => (
                                <Link
                                    key={comment.id}
                                    to={`/posts/${comment.post_id}`}
                                    className="block"
                                    style={{ animation: `fadeInUp 0.35s ease-out ${i * 60}ms both` }}
                                >
                                    <Card hover padding="p-5" className="hover:-translate-y-1">
                                        <div className="text-xs font-semibold text-brand mb-3 flex items-center gap-1.5 opacity-90">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            <span className="tracking-wide">On post: <span className="text-foreground ml-1">{comment.post_title || `Post #${comment.post_id}`}</span></span>
                                        </div>
                                        <p className="text-sm text-foreground line-clamp-3 pl-4 border-l-2 border-brand/30 italic opacity-90 leading-relaxed">"{comment.content}"</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card padding="py-12 px-4" className="flex flex-col items-center justify-center border-dashed text-foreground-muted text-center">
                            <div className="w-12 h-12 rounded-xl bg-brand/5 flex items-center justify-center mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>
                                <svg className="w-6 h-6 text-brand/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <p className="text-sm font-medium">No feedback left yet.</p>
                        </Card>
                    )}
                </section>
            </div>
        </div>
    );
}
