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
        return <div className="text-center py-12 text-foreground-muted animate-pulse">Loading profile...</div>;
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
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Section */}
            <Card padding="p-0" className="shadow-sm overflow-hidden">
                <div className="h-[120px] w-full bg-gradient-to-r from-brand/20 to-brand/5 backdrop-blur-sm"></div>

                <div className="px-8 pb-8 relative flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-brand text-surface flex items-center justify-center font-bold text-4xl shadow-md ring-4 ring-surface -mt-10 mb-4 z-10">
                        {profileData.username?.charAt(0).toUpperCase()}
                    </div>

                    <h1 className="text-3xl font-extrabold text-foreground">{profileData.username}</h1>
                    {joinedDate && <p className="text-foreground-muted text-sm mt-1 mb-2 font-medium">{joinedDate}</p>}

                    {isCurrentUser && (
                        <div className="mt-4 flex gap-3">
                            <button className="px-5 py-2 border border-border-subtle bg-surface hover:bg-surface-hover text-foreground shadow-sm rounded-lg text-sm font-semibold hover:border-brand hover:text-brand transition-colors cursor-pointer">
                                Edit Profile
                            </button>
                            <Link to="/notifications" className="px-5 py-2 border border-border-subtle bg-surface hover:bg-surface-hover text-foreground shadow-sm rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                Notifications
                            </Link>
                        </div>
                    )}
                </div>
            </Card>

            {/* Stats Bar Section */}
            <Card padding="p-6" className="shadow-sm flex items-center justify-around text-center">
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black text-foreground mb-1">{profileData.posts?.length || 0}</span>
                    <span className="text-xs text-foreground-muted uppercase tracking-widest font-bold">Posts</span>
                </div>
                <div className="w-px h-12 bg-border-subtle"></div>
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black text-foreground mb-1">{profileData.comments?.length || 0}</span>
                    <span className="text-xs text-foreground-muted uppercase tracking-widest font-bold">Comments</span>
                </div>
                <div className="w-px h-12 bg-border-subtle"></div>
                <div className="flex flex-col flex-1">
                    <span className="text-3xl font-black text-brand mb-1">{totalLikes}</span>
                    <span className="text-xs text-foreground-muted uppercase tracking-widest font-bold">Likes <span className="hidden sm:inline">Received</span></span>
                </div>
            </Card>

            {/* Grid Section */}
            <div className="grid md:grid-cols-2 gap-6">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground border-b border-border-subtle pb-3">Activity</h2>
                    {profileData.posts && profileData.posts.length > 0 ? (
                        <div className="space-y-3">
                            {profileData.posts.map(post => (
                                <Link
                                    key={post.id}
                                    to={`/posts/${post.id}`}
                                    className="block"
                                >
                                    <Card hover accent padding="p-5" className="hover:-translate-y-0.5 relative">
                                        <div className="mb-2.5">
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-border-subtle/50 text-foreground-muted">
                                                {post.category || "General"}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground group-hover:text-brand transition-colors mb-2 leading-tight">{post.title}</h3>
                                        <p className="text-sm text-foreground-muted line-clamp-2 opacity-80">{post.content}</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card padding="py-12 px-4" className="flex flex-col items-center justify-center border-dashed text-foreground-muted text-center">
                            <svg className="w-10 h-10 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            <p className="text-sm font-medium">No posts published yet.</p>
                        </Card>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground border-b border-border-subtle pb-3">Recent Comments</h2>
                    {profileData.comments && profileData.comments.length > 0 ? (
                        <div className="space-y-3">
                            {profileData.comments.map(comment => (
                                <Link
                                    key={comment.id}
                                    to={`/posts/${comment.post_id}`}
                                    className="block"
                                >
                                    <Card hover padding="p-5" className="hover:-translate-y-0.5">
                                        <div className="text-xs font-semibold text-brand mb-3 flex items-center gap-1.5 opacity-90">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            <span className="tracking-wide">On post: <span className="text-foreground ml-1">{comment.post_title || `Post #${comment.post_id}`}</span></span>
                                        </div>
                                        <p className="text-sm text-foreground line-clamp-3 pl-4 border-l-2 border-border-subtle italic opacity-90">"{comment.content}"</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card padding="py-12 px-4" className="flex flex-col items-center justify-center border-dashed text-foreground-muted text-center">
                            <svg className="w-10 h-10 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <p className="text-sm font-medium">No feedback left yet.</p>
                        </Card>
                    )}
                </section>
            </div>
        </div>
    );
}
