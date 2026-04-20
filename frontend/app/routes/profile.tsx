import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import { postsClient, usersClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { ACCENT_COLORS } from "./edit-profile";

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
    profile_meta?: any;
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
                // Fetch posts/comments from posts_service
                const [postsRes, metaRes] = await Promise.all([
                    postsClient.get(`/users/${userId}`),
                    // Fetch profile_meta from users_service (authoritative source) to bypass replica sync issues 
                    usersClient.get(`/users/${userId}/profile_meta`).catch(() => ({ data: { profile_meta: {} } }))
                ]);
                const merged = {
                    ...postsRes.data,
                    profile_meta: metaRes.data.profile_meta || postsRes.data.profile_meta || {}
                };
                setProfileData(merged);
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

    const profileMeta = useMemo(() => {
        if (profileData?.profile_meta) return profileData.profile_meta;
        return {};
    }, [profileData?.profile_meta]);


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

    // F1-F: Show accent dot for current user
    const accentId = isCurrentUser
        ? (localStorage.getItem("ngf_accent_color") || "violet")
        : null;
    const accentColor = accentId ? ACCENT_COLORS.find(c => c.id === accentId) : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Section */}
            <Card padding="p-0" className="shadow-sm overflow-hidden">
                <div className="h-[120px] w-full bg-gradient-to-r from-brand/20 to-brand/5 backdrop-blur-sm"></div>

                <div className="px-8 pb-8 relative flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-brand text-surface flex items-center justify-center font-bold text-4xl shadow-md ring-4 ring-surface -mt-10 mb-4 z-10">
                        {profileData.username?.charAt(0).toUpperCase()}
                    </div>

                    <h1 className="text-3xl font-extrabold text-foreground flex items-center">
                        {profileData.username}
                        {accentColor && (
                            <span
                                className="inline-block w-3 h-3 rounded-full ml-2 mb-0.5 align-middle ring-2 ring-surface"
                                style={{
                                    background: `linear-gradient(135deg, ${accentColor.light.brand}, ${accentColor.dark.brand})`,
                                }}
                                title={`${accentColor.label} accent`}
                            />
                        )}
                    </h1>
                    {joinedDate && <p className="text-foreground-muted text-sm mt-1 mb-2 font-medium">{joinedDate}</p>}

                    {profileMeta.bio && (
                        <p className="text-sm text-foreground text-center max-w-sm 
                                      leading-relaxed mt-1 mb-2">
                            {profileMeta.bio}
                        </p>
                    )}

                    {/* ── Premium Metadata Bar */}
                    {(profileMeta.location || profileMeta.website || profileMeta.twitter || profileMeta.github) && (
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 
                                        mt-4 px-6 py-3 rounded-2xl bg-surface-raised/50 
                                        border border-border-subtle backdrop-blur-md shadow-sm">
                            
                            {/* Location Pill */}
                            {profileMeta.location && (profileMeta.privacy?.showLocation ?? true) && (
                                <div className="flex items-center gap-1.5 text-xs font-semibold
                                                text-foreground-muted bg-surface border border-border-subtle
                                                px-3 py-1.5 rounded-full shadow-sm hover:border-brand/40 
                                                transition-all duration-300">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                         strokeLinejoin="round" className="text-brand/70">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    {profileMeta.location}
                                </div>
                            )}

                            {/* Divider for socials if location exists */}
                            {profileMeta.location && (profileMeta.privacy?.showLocation ?? true) && (profileMeta.website || profileMeta.twitter || profileMeta.github) && (
                                <div className="hidden sm:block w-px h-4 bg-border-subtle"></div>
                            )}

                            {/* Social Icons Group */}
                            <div className="flex items-center gap-2">
                                {profileMeta.website && (profileMeta.privacy?.showWebsite ?? true) && (
                                    <a
                                        href={profileMeta.website.startsWith("http")
                                            ? profileMeta.website
                                            : `https://${profileMeta.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Website"
                                        className="p-2 text-foreground-muted hover:text-brand 
                                                 hover:bg-brand-subtle rounded-xl transition-all 
                                                 duration-200 press-effect"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                             strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="2" y1="12" x2="22" y2="12"/>
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
                                                     15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                        </svg>
                                    </a>
                                )}

                                {profileMeta.twitter && (profileMeta.privacy?.showTwitter ?? true) && (
                                    <a
                                        href={`https://x.com/${profileMeta.twitter}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Twitter / X"
                                        className="p-2 text-foreground-muted hover:text-brand 
                                                 hover:bg-brand-subtle rounded-xl transition-all 
                                                 duration-200 press-effect"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </a>
                                )}

                                {profileMeta.github && (profileMeta.privacy?.showGithub ?? true) && (
                                    <a
                                        href={`https://github.com/${profileMeta.github}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="GitHub"
                                        className="p-2 text-foreground-muted hover:text-brand 
                                                 hover:bg-brand-subtle rounded-xl transition-all 
                                                 duration-200 press-effect"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s 2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {isCurrentUser && (
                        <div className="mt-4 flex gap-3">
                            <Link
                                to="/settings/profile"
                                className="px-5 py-2 border border-border-subtle bg-surface hover:bg-surface-hover text-foreground shadow-sm rounded-lg text-sm font-semibold hover:border-brand hover:text-brand transition-colors cursor-pointer text-center"
                            >
                                Edit Profile
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
