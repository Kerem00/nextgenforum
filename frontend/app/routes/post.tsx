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

export default function PostDetail() {
    const { postId } = useParams();
    const { user } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [likingPost, setLikingPost] = useState(false);
    const [likingComments, setLikingComments] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchPostDetails = async () => {
            try {
                setLoading(true);
                // Since there is no direct GET /posts/{postId} in the spec,
                // we fetch all posts and find the matching one.
                const [postsRes, commentsRes] = await Promise.all([
                    postsClient.get("/posts"),
                    postsClient.get(`/posts/${postId}/comments`)
                ]);

                const foundPost = postsRes.data.find((p: Post) => p.id === Number(postId));
                if (foundPost) {
                    setPost(foundPost);
                }
                setComments(commentsRes.data || []);
            } catch (err) {
                console.error("Failed to fetch post details", err);
            } finally {
                setLoading(false);
            }
        };

        if (postId) {
            fetchPostDetails();
        }
    }, [postId]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !postId) return;

        try {
            setSubmittingComment(true);
            const res = await postsClient.post(`/posts/${postId}/comments`, {
                content: newComment
            });
            setComments([...comments, res.data]);
            setNewComment("");
        } catch (err) {
            console.error("Failed to add comment", err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleLikePost = async () => {
        if (!postId || !user) return;
        try {
            setLikingPost(true);
            await postsClient.post(`/posts/${postId}/like`);
            // Since it doesn't return updated like count we just alert or show a toast
            alert("Post liked!");
        } catch (err) {
            console.error("Failed to like post", err);
        } finally {
            setLikingPost(false);
        }
    };

    const handleLikeComment = async (commentId: number) => {
        if (!user) return;
        try {
            setLikingComments({ ...likingComments, [commentId]: true });
            await postsClient.post(`/comments/${commentId}/like`);
            alert("Comment liked!");
        } catch (err) {
            console.error("Failed to like comment", err);
        } finally {
            setLikingComments({ ...likingComments, [commentId]: false });
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-foreground-muted animate-pulse">Loading discussion...</div>;
    }

    if (!post) {
        return (
            <div className="text-center py-12 mt-8 bg-surface rounded-xl border border-border-subtle max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground">Discussion not found</h2>
                <Link to="/" className="text-brand hover:underline mt-4 inline-block">Return to home</Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <Link to="/" className="text-sm font-medium text-foreground-muted hover:text-foreground inline-flex items-center gap-2 mb-6 transition-colors">
                ← Back to discussions
            </Link>

            <article className="bg-surface rounded-xl p-8 shadow-sm border border-border-subtle">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">{post.title}</h1>
                <div className="text-sm text-foreground-muted mb-8 flex items-center justify-between">
                    <span>Posted by User #{post.owner_id}</span>
                    {user && (
                        <button
                            onClick={handleLikePost}
                            disabled={likingPost}
                            className="px-4 py-1.5 rounded-full border border-border-subtle bg-background text-foreground text-sm hover:bg-surface-hover hover:border-brand/40 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {likingPost ? "Liking..." : "♥ Like Post"}
                        </button>
                    )}
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
                    {post.content}
                </div>
            </article>

            <section className="space-y-6">
                <h3 className="text-xl font-bold text-foreground">Comments ({comments.length})</h3>

                {user ? (
                    <form onSubmit={handleAddComment} className="flex gap-4 items-start bg-surface p-6 rounded-xl border border-border-subtle">
                        <div className="w-8 h-8 rounded-full bg-brand text-surface flex items-center justify-center font-bold flex-shrink-0">
                            {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 space-y-3">
                            <textarea
                                placeholder="Add to the discussion..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-[80px] text-foreground resize-y placeholder-[var(--theme-foreground-muted)]"
                                required
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submittingComment}
                                    className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-surface shadow transition-colors hover:bg-brand-hover disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingComment ? "Posting..." : "Comment"}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="bg-surface p-6 rounded-xl border border-border-subtle text-center text-foreground-muted">
                        <Link to="/login" className="text-brand font-medium hover:underline">Log in</Link> to join the conversation.
                    </div>
                )}

                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="bg-surface p-5 py-4 rounded-xl border border-border-subtle flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-border-subtle text-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm">
                                U{comment.owner_id}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-foreground text-sm">User #{comment.owner_id}</span>
                                    {user && (
                                        <button
                                            onClick={() => handleLikeComment(comment.id)}
                                            disabled={likingComments[comment.id]}
                                            className="text-xs text-foreground-muted hover:text-brand transition-colors cursor-pointer"
                                        >
                                            {likingComments[comment.id] ? "..." : "♥ Like"}
                                        </button>
                                    )}
                                </div>
                                <p className="text-foreground text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
