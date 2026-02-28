import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";

type Post = {
    id: number;
    title: string;
    content: string;
    owner_id: number;
};

type Comment = {
    id: number;
    content: string;
    post_id: number;
    owner_id: number;
};

type UserProfile = {
    id: number;
    email: string;
    username: string;
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

    if (loading) {
        return <div className="text-center py-12 text-foreground-muted animate-pulse">Loading profile...</div>;
    }

    if (error || !profileData) {
        return (
            <div className="text-center py-12 mt-8 bg-surface rounded-xl border border-border-subtle max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground">{error || "User not found"}</h2>
                <Link to="/" className="text-brand hover:underline mt-4 inline-block">Return to home</Link>
            </div>
        );
    }

    const isCurrentUser = currentUser?.id === Number(userId);

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-surface rounded-xl p-8 shadow-sm border border-border-subtle flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-brand text-surface flex items-center justify-center font-bold text-3xl mb-4 shadow-inner">
                    {profileData.username?.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{profileData.username}</h1>
                <p className="text-foreground-muted">{profileData.email}</p>

                {isCurrentUser && (
                    <div className="mt-4 px-3 py-1 bg-background border border-border-subtle rounded-full text-xs font-medium text-foreground-muted">
                        This is your profile
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground border-b border-border-subtle pb-2">Posts ({profileData.posts?.length || 0})</h2>
                    {profileData.posts && profileData.posts.length > 0 ? (
                        profileData.posts.map(post => (
                            <Link
                                key={post.id}
                                to={`/posts/${post.id}`}
                                className="block bg-surface p-4 rounded-xl border border-border-subtle hover:border-brand/40 transition-colors group"
                            >
                                <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors mb-1">{post.title}</h3>
                                <p className="text-xs text-foreground-muted line-clamp-2">{post.content}</p>
                            </Link>
                        ))
                    ) : (
                        <div className="text-sm text-foreground-muted py-4">No posts yet.</div>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground border-b border-border-subtle pb-2">Recent Comments ({profileData.comments?.length || 0})</h2>
                    {profileData.comments && profileData.comments.length > 0 ? (
                        profileData.comments.map(comment => (
                            <Link
                                key={comment.id}
                                to={`/posts/${comment.post_id}`}
                                className="block bg-surface p-4 rounded-xl border border-border-subtle hover:border-brand/40 transition-colors"
                            >
                                <div className="text-xs font-medium text-foreground-muted mb-1">On Post #{comment.post_id}</div>
                                <p className="text-sm text-foreground line-clamp-3">{comment.content}</p>
                            </Link>
                        ))
                    ) : (
                        <div className="text-sm text-foreground-muted py-4">No comments yet.</div>
                    )}
                </section>
            </div>
        </div>
    );
}
