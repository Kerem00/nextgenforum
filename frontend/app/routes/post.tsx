import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownTextarea from "../components/MarkdownTextarea";

type Post = {
    id: number;
    title: string;
    content: string;
    category: string;
    is_edited: boolean;
    owner_id: number;
    created_at: string;
    owner: {
        id: number;
        email: string;
        username: string;
    };
    likes: { owner_id: number }[];
};

type Comment = {
    id: number;
    content: string;
    post_id: number;
    owner_id: number;
    is_edited: boolean;
    is_pinned: boolean;
    created_at: string;
    owner: {
        id: number;
        email: string;
        username: string;
    };
    likes: { owner_id: number }[];
};

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const years = Math.floor(diffInSeconds / 31536000);
    if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;

    const months = Math.floor(diffInSeconds / 2592000);
    if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;

    const weeks = Math.floor(diffInSeconds / 604800);
    if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;

    const days = Math.floor(diffInSeconds / 86400);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;

    const hours = Math.floor(diffInSeconds / 3600);
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    return "just now";
}

function renderCommentContent(text: string, knownUsers: {id: number, username: string}[]) {
    // We replace @username with a special markdown link `[@username](mention:username)`
    // Use negative lookbehind to avoid matching emails or word-alphanumeric@mention
    const preprocessedText = text.replace(/(^|[^\w])@([a-zA-Z0-9_]+)/g, (match, prefix, username) => {
        return `${prefix}[@${username}](mention:${username})`;
    });

    // Custom renderer for links to intercept 'mention:'
    const components: Components = {
        a: ({ node, href, children, ...props }) => {
            if (href?.startsWith('mention:')) {
                const username = href.replace('mention:', '');
                const matchedUser = knownUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
                
                const mentionClass = "font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded-md mx-0.5";
                
                if (matchedUser) {
                    return <Link to={`/users/${matchedUser.id}`} className={`${mentionClass} hover:bg-brand/20 transition-colors`}>{children}</Link>;
                } else {
                    return <span className={mentionClass}>{children}</span>;
                }
            }
            // @ts-ignore - ReactMarkdown types are sometimes overly strict with standard anchor props
            return <a href={href} className="text-brand hover:underline" {...props}>{children}</a>;
        },
        blockquote: ({ children }) => (
            <div className="flex items-stretch gap-0 my-3 rounded-lg overflow-hidden border border-brand/15 bg-brand/5 not-italic">
                <div className="w-1 flex-shrink-0 bg-brand/50 rounded-l-lg" />
                <div className="py-2.5 px-3 min-w-0 flex-1 text-xs text-foreground-muted [&>p]:m-0 [&_strong]:text-brand [&_strong]:not-italic">
                    <div className="flex items-center gap-1 mb-0.5 opacity-60">
                        <svg className="w-3 h-3 text-brand" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.293-3.995 5.848h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.293-3.996 5.848h3.983v10h-9.983z"/></svg>
                    </div>
                    {children}
                </div>
            </div>
        )
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {preprocessedText}
        </ReactMarkdown>
    );
}

function SkeletonPostCard({ index = 0 }: { index?: number }) {
  // Use index to deterministically but organically stagger the fade-in and set widths
  const delay = `${index * 100}ms`;
  const titleWidth = `${60 + (index % 3) * 15}%`; // Varies between 60%, 75%, 90%
  const line1Width = `${85 + (index % 2) * 10}%`; // Varies between 85%, 95%
  const line2Width = `${40 + (index % 4) * 10}%`; // Varies between 40%, 50%, 60%, 70%

  return (
    <div
      className="block bg-surface p-6 rounded-xl border border-border-subtle opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-16 h-4 bg-border-subtle rounded animate-pulse"></div>
      </div>
      <div className="h-6 bg-border-subtle rounded animate-pulse mt-2 mb-4" style={{ width: titleWidth }}></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-border-subtle rounded animate-pulse" style={{ width: line1Width }}></div>
        <div className="h-4 bg-border-subtle rounded animate-pulse" style={{ width: line2Width }}></div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-border-subtle animate-pulse"></div>
          <div className="w-24 h-4 bg-border-subtle rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default function PostDetail() {
    const { postId } = useParams();
    const { user } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(false);

    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [likingPost, setLikingPost] = useState(false);
    const [likingComments, setLikingComments] = useState<Record<number, boolean>>({});

    const [editingPost, setEditingPost] = useState(false);
    const [editPostTitle, setEditPostTitle] = useState("");
    const [editPostContent, setEditPostContent] = useState("");
    const [submitEditPost, setSubmitEditPost] = useState(false);

    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [submitEditComment, setSubmitEditComment] = useState(false);

    const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);

    const [showPostMenu, setShowPostMenu] = useState(false);
    const [showCommentMenu, setShowCommentMenu] = useState<number | null>(null);

    const [pinningCommentId, setPinningCommentId] = useState<number | null>(null);
    const [showPinModal, setShowPinModal] = useState<number | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const postMenuRef = useRef<HTMLDivElement>(null);
    const commentMenuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (showPostMenu && postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
                setShowPostMenu(false);
            }
            if (showCommentMenu !== null && commentMenuRef.current && !commentMenuRef.current.contains(event.target as Node)) {
                setShowCommentMenu(null);
            }
        }
        
        function handleScroll() {
            if (showPostMenu) setShowPostMenu(false);
            if (showCommentMenu !== null) setShowCommentMenu(null);
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [showPostMenu, showCommentMenu]);

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
                setShowSkeleton(false);
            }
        };

        if (postId) {
            fetchPostDetails();
        }
    }, [postId]);

    // Delay showing the skeleton loading state by 200ms to avoid flashes on fast connections
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading) {
            timer = setTimeout(() => setShowSkeleton(true), 200);
        } else {
            setShowSkeleton(false);
        }

        return () => clearTimeout(timer);
    }, [loading]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !postId) return;

        // Prepend a markdown blockquote of the parent comment if replying
        let finalContent = newComment;
        if (replyingToCommentId) {
            const parentComment = comments.find((c: Comment) => c.id === replyingToCommentId);
            if (parentComment) {
                // Truncate the quoted text to 80 chars, replace newlines with spaces
                const quoteText = parentComment.content.replace(/\n/g, " ").slice(0, 80);
                const ellipsis = parentComment.content.length > 80 ? "..." : "";
                finalContent = `> **${parentComment.owner.username}:** ${quoteText}${ellipsis}\n\n${newComment}`;
            }
        }

        try {
            setSubmittingComment(true);
            const res = await postsClient.post(`/posts/${postId}/comments`, {
                content: finalContent
            });
            setComments([...comments, res.data]);
            setNewComment("");
            setReplyingToCommentId(null);
        } catch (err) {
            console.error("Failed to add comment", err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleReply = (commentId: number, username: string) => {
        setReplyingToCommentId(commentId);
        setNewComment(`@${username} `);
        if (commentInputRef.current) {
            commentInputRef.current.focus();
            commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleLikePost = async () => {
        if (!postId || !user || !post) return;

        const isCurrentlyLiked = post.likes?.some(like => like.owner_id === user.id);

        try {
            setLikingPost(true);
            if (isCurrentlyLiked) {
                await postsClient.delete(`/posts/${postId}/like`);
                setPost({ ...post, likes: post.likes.filter(like => like.owner_id !== user.id) });
            } else {
                await postsClient.post(`/posts/${postId}/like`);
                setPost({ ...post, likes: [...(post.likes || []), { owner_id: user.id }] });
            }
        } catch (err) {
            console.error("Failed to toggle post like", err);
        } finally {
            setLikingPost(false);
        }
    };

    const handleSavePostEdit = async () => {
        if (!postId || !post || !editPostTitle.trim() || !editPostContent.trim()) return;
        try {
            setSubmitEditPost(true);
            const res = await postsClient.put(`/posts/${postId}`, {
                title: editPostTitle,
                content: editPostContent,
                category: post.category
            });
            setPost(res.data);
            setEditingPost(false);
            setShowPostMenu(false);
        } catch (err) {
            console.error("Failed to update post", err);
        } finally {
            setSubmitEditPost(false);
        }
    };

    const handleLikeComment = async (commentId: number) => {
        if (!user) return;

        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        const isCurrentlyLiked = comment.likes?.some(like => like.owner_id === user.id);

        try {
            setLikingComments({ ...likingComments, [commentId]: true });
            if (isCurrentlyLiked) {
                await postsClient.delete(`/comments/${commentId}/like`);
                setComments(comments.map(c =>
                    c.id === commentId ? { ...c, likes: c.likes.filter(l => l.owner_id !== user.id) } : c
                ));
            } else {
                await postsClient.post(`/comments/${commentId}/like`);
                setComments(comments.map(c =>
                    c.id === commentId ? { ...c, likes: [...(c.likes || []), { owner_id: user.id }] } : c
                ));
            }
        } catch (err) {
            console.error("Failed to toggle comment like", err);
        } finally {
            setLikingComments({ ...likingComments, [commentId]: false });
        }
    };

    const handleSaveCommentEdit = async (commentId: number) => {
        if (!editCommentContent.trim()) return;
        try {
            setSubmitEditComment(true);
            const res = await postsClient.put(`/comments/${commentId}`, {
                content: editCommentContent
            });
            setComments(comments.map(c => c.id === commentId ? res.data : c));
            setEditingCommentId(null);
            setShowCommentMenu(null);
        } catch (err) {
            console.error("Failed to update comment", err);
        } finally {
            setSubmitEditComment(false);
        }
    };

    const handleSharePost = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 6000); // 6 seconds glow
        } catch (err) {
            console.error("Failed to copy link", err);
        }
    };

    const confirmPinComment = async (commentId: number) => {
        try {
            setPinningCommentId(commentId);
            const res = await postsClient.post(`/comments/${commentId}/pin`);

            // Re-fetch comments to get updated strict order and pinned statuses natively from backend
            const commentsRes = await postsClient.get(`/posts/${postId}/comments`);
            setComments(commentsRes.data || []);

            setShowPinModal(null);
            setShowCommentMenu(null);
        } catch (err) {
            console.error("Failed to pin comment", err);
        } finally {
            setPinningCommentId(null);
        }
    };

    const handlePinComment = (commentId: number) => {
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        // If it's already pinned, unpin it immediately
        if (comment.is_pinned) {
            confirmPinComment(commentId);
            return;
        }

        // If we want to pin it, check if another comment is already pinned
        const currentlyPinned = comments.find(c => c.is_pinned);
        if (currentlyPinned && currentlyPinned.id !== commentId) {
            setShowPinModal(commentId);
        } else {
            confirmPinComment(commentId);
        }
    };

    if (loading) {
        return (
            <div className={`max-w-3xl mx-auto space-y-8 transition-opacity duration-500 ${showSkeleton ? 'opacity-100' : 'opacity-0'}`}>
                {showSkeleton ? <SkeletonPostCard /> : <div className="h-64" />}
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-12 mt-8 bg-surface rounded-xl border border-border-subtle max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground">Discussion not found</h2>
                <Link to="/" className="text-brand hover:underline mt-4 inline-block">Return to home</Link>
            </div>
        );
    }

    const isPostLikedByMe = user ? post.likes?.some(l => l.owner_id === user.id) : false;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <Link to="/" className="text-sm font-medium text-foreground-muted hover:text-foreground inline-flex items-center gap-2 mb-6 transition-colors">
                ← Back to discussions
            </Link>

            {showPinModal !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-subtle rounded-xl p-6 max-w-sm w-full shadow-lg">
                        <h3 className="text-lg font-bold text-foreground mb-2">Replace pinned comment?</h3>
                        <p className="text-sm text-foreground-muted mb-6">You can only pin one comment at a time. This will unpin the currently pinned comment.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowPinModal(null)} className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => confirmPinComment(showPinModal)} className="px-4 py-2 text-sm font-medium text-surface bg-brand rounded-lg hover:bg-brand-hover transition-colors">
                                Replace
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <article className="bg-surface rounded-xl p-5 md:p-6 shadow-sm border border-border-subtle relative">
                {user && (
                    <div className="absolute top-4 right-4 md:top-5 md:right-5" ref={postMenuRef}>
                        <button
                            onClick={() => setShowPostMenu(!showPostMenu)}
                            className="text-foreground-muted hover:text-foreground p-2 rounded-md hover:bg-background transition-colors cursor-pointer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>
                        <div className={`absolute right-0 top-full mt-1 w-40 bg-surface rounded-xl shadow-lg border border-border-subtle z-10 py-1 text-sm overflow-hidden transition-all duration-200 origin-top-right ${showPostMenu ? 'opacity-100 scale-100 max-h-[200px]' : 'opacity-0 scale-95 pointer-events-none max-h-0'}`}>
                            {user.id === post.owner_id ? (
                                <button
                                    onClick={() => { setEditingPost(true); setEditPostTitle(post.title); setEditPostContent(post.content); setShowPostMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-foreground hover:bg-background transition-colors cursor-pointer"
                                >
                                    Edit Post
                                </button>
                            ) : (
                                <button
                                    onClick={() => alert("Report post clicked (no functionality yet)")}
                                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                                >
                                    Report Post
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-border-subtle/50 text-foreground-muted capitalize">
                            {post.category}
                        </span>
                        <span className="text-xs text-foreground-muted">{timeAgo(post.created_at)}</span>
                    </div>
                    {post.is_edited && (
                        <span className="text-xs text-foreground-muted italic">Edited</span>
                    )}
                </div>

                {editingPost ? (
                    <div className="space-y-4 mb-8 pr-12">
                        <input
                            type="text"
                            value={editPostTitle}
                            onChange={(e) => setEditPostTitle(e.target.value)}
                            className="w-full px-4 py-2 text-xl font-bold bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-foreground"
                        />
                        <MarkdownTextarea
                            value={editPostContent}
                            onValueChange={setEditPostContent}
                            className="min-h-[150px]"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSavePostEdit} disabled={submitEditPost} className="px-4 py-2 bg-brand text-surface rounded-md text-sm font-medium hover:bg-brand-hover transition-colors cursor-pointer">
                                {submitEditPost ? "Saving..." : "Save Changes"}
                            </button>
                            <button onClick={() => setEditingPost(false)} className="px-4 py-2 bg-background text-foreground border border-border-subtle rounded-md text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3 pr-10">{post.title}</h1>
                        <div className="text-sm text-foreground-muted mb-6 flex items-center gap-2">
                            <Link to={`/users/${post.owner_id}`} className="flex items-center gap-2 hover:text-brand transition-colors">
                                <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-xs text-brand uppercase">
                                    {post.owner.username.charAt(0)}
                                </div>
                                <span>{post.owner.username}</span>
                            </Link>
                        </div>
                        <div className="markdown-content max-w-none text-foreground mb-8">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {post.content}
                            </ReactMarkdown>
                        </div>
                    </>
                )}

                <div className="flex items-center justify-start gap-4 mt-8 border-t border-border-subtle pt-6">
                    {user ? (
                        <>
                            <button
                                onClick={handleLikePost}
                                disabled={likingPost}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer text-sm ${isPostLikedByMe
                                    ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105"
                                    : "bg-background border-border-subtle text-foreground hover:bg-surface-hover hover:border-brand/40"
                                    } disabled:opacity-50`}
                            >
                                <svg className={`w-4 h-4 transition-transform duration-300 ${isPostLikedByMe ? "fill-current scale-110" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isPostLikedByMe ? "0" : "2"}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                <span className="font-medium">{isPostLikedByMe ? "Liked" : "Like"}</span>
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-background/50 text-[10px] text-foreground font-bold">{post.likes?.length || 0}</span>
                            </button>
                            <button
                                onClick={handleSharePost}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer text-sm ${isCopied
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105"
                                    : "bg-background border-border-subtle text-foreground hover:bg-surface-hover hover:border-brand/40"}`}
                            >
                                <svg className={`w-4 h-4 transition-transform duration-300 ${isCopied ? "stroke-blue-500 scale-110" : "stroke-current"}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                    <polyline points="16 6 12 2 8 6"></polyline>
                                    <line x1="12" y1="2" x2="12" y2="15"></line>
                                </svg>
                                <span className="font-medium">{isCopied ? "Copied!" : "Share"}</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-subtle bg-background text-foreground-muted text-sm">
                            <span className="text-base leading-none">♥</span>
                            <span className="font-medium">{post.likes?.length || 0} Likes</span>
                        </div>
                    )}
                </div>
            </article>

            <section className="space-y-6">
                <h3 className="text-xl font-bold text-foreground">Comments ({comments.length})</h3>

                {user ? (
                    <form onSubmit={handleAddComment} className="flex gap-4 items-start bg-surface p-6 rounded-xl border border-border-subtle flex-col md:flex-row">
                        <div className="hidden md:flex w-8 h-8 rounded-full bg-brand text-surface items-center justify-center font-bold flex-shrink-0 mt-2">
                            {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 w-full space-y-3">
                            {replyingToCommentId && (
                                <div className="flex justify-between items-start bg-surface p-3 rounded-lg border-l-4 border-l-brand/40 border border-border-subtle shadow-sm mb-2 relative">
                                    <div className="flex-1 min-w-0 pr-6 space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground-muted">
                                            <span>Replying to {comments.find((c: Comment) => c.id === replyingToCommentId)?.owner.username}</span>
                                        </div>
                                        <div className="text-sm text-foreground-muted italic truncate">
                                            {comments.find((c: Comment) => c.id === replyingToCommentId)?.content.slice(0, 100)}
                                            {(comments.find((c: Comment) => c.id === replyingToCommentId)?.content.length || 0) > 100 ? "..." : ""}
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setReplyingToCommentId(null)}
                                        className="absolute top-2 right-2 text-foreground-muted hover:text-foreground p-1 transition-colors cursor-pointer"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            )}
                            <MarkdownTextarea
                                ref={commentInputRef}
                                placeholder="Add to the discussion... (Type @ to mention)"
                                value={newComment}
                                onValueChange={setNewComment}
                                knownUsers={Array.from(new Map(comments.map((c: Comment) => [c.owner.id, c.owner])).values()) as {id: number, username: string}[]}
                                className="min-h-[80px]"
                            />
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-foreground-muted">Markdown supported</p>
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
                    {comments.map(comment => {
                        const isCommentLikedByMe = user ? comment.likes?.some(l => l.owner_id === user.id) : false;
                        const isEditingThis = editingCommentId === comment.id;

                        return (
                            <div key={comment.id} className={`bg-surface p-5 py-4 rounded-xl border flex gap-4 relative group ${comment.is_pinned ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-border-subtle'}`}>
                                <div className="w-8 h-8 rounded-full bg-border-subtle text-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm uppercase">
                                    {comment.owner.username.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link to={`/users/${comment.owner_id}`} className="font-medium text-foreground text-sm hover:text-brand transition-colors">
                                                {comment.owner.username}
                                            </Link>
                                            <span className="text-xs text-foreground-muted">{timeAgo(comment.created_at)}</span>
                                            {comment.is_pinned && <span className="text-xs font-semibold px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded border border-green-500/20">Pinned comment</span>}
                                            {comment.is_edited && <span className="text-xs text-foreground-muted italic">Edited</span>}
                                        </div>

                                        {user && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 mix-blend-luminosity hover:mix-blend-normal">
                                                    <button
                                                        onClick={() => handleLikeComment(comment.id)}
                                                        disabled={likingComments[comment.id]}
                                                        className={`transition-all duration-300 transform cursor-pointer ${isCommentLikedByMe
                                                            ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                            : "text-foreground-muted hover:text-red-400 hover:scale-110"
                                                            }`}
                                                        title={isCommentLikedByMe ? "Unlike" : "Like"}
                                                    >
                                                        <svg className={`w-5 h-5 ${isCommentLikedByMe ? "fill-current" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isCommentLikedByMe ? "0" : "2"}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                    </button>
                                                    <span className={`text-xs font-semibold ${isCommentLikedByMe ? "text-red-500" : "text-foreground-muted"}`}>
                                                        {comment.likes?.length || 0}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handleReply(comment.id, comment.owner.username)}
                                                    className="text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer ml-1"
                                                >
                                                    Reply
                                                </button>

                                                <div className="relative" ref={showCommentMenu === comment.id ? commentMenuRef : null}>
                                                    <button
                                                        onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                                        className={`text-foreground-muted hover:text-foreground transition-opacity p-1 rounded-md hover:bg-background cursor-pointer ${showCommentMenu === comment.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                    </button>
                                                    <div className={`absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl shadow-lg border border-border-subtle z-10 py-1 text-sm overflow-hidden transition-all duration-200 origin-top-right ${showCommentMenu === comment.id ? 'opacity-100 scale-100 max-h-[250px]' : 'opacity-0 scale-95 pointer-events-none max-h-0'}`}>
                                                        {user.id === post.owner_id && (
                                                            <button
                                                                onClick={() => { handlePinComment(comment.id); setShowCommentMenu(null); }}
                                                                className="w-full text-left px-4 py-2 text-foreground hover:bg-background transition-colors cursor-pointer"
                                                            >
                                                                {comment.is_pinned ? "Unpin Comment" : "Pin Comment"}
                                                            </button>
                                                        )}
                                                        {user.id === comment.owner_id ? (
                                                            <button
                                                                onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); setShowCommentMenu(null); }}
                                                                className="w-full text-left px-4 py-2 text-foreground hover:bg-background transition-colors cursor-pointer"
                                                            >
                                                                Edit Comment
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => { alert("Report comment clicked (no functionality yet)"); setShowCommentMenu(null); }}
                                                                className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                                                            >
                                                                Report Comment
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isEditingThis ? (
                                        <div className="mt-2 space-y-2">
                                            <MarkdownTextarea
                                                value={editCommentContent}
                                                onValueChange={setEditCommentContent}
                                                className="min-h-[60px]"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 bg-background text-foreground border border-border-subtle rounded text-xs font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                                                    Cancel
                                                </button>
                                                <button onClick={() => handleSaveCommentEdit(comment.id)} disabled={submitEditComment} className="px-3 py-1 bg-brand text-surface rounded text-xs font-medium hover:bg-brand-hover transition-colors cursor-pointer">
                                                    {submitEditComment ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="markdown-content text-foreground text-sm">
                                            {renderCommentContent(comment.content, Array.from(new Map(comments.map((c: Comment) => [c.owner.id, c.owner])).values()) as {id: number, username: string}[])}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    );
}
