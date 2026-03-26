import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";
import MarkdownTextarea from "../components/MarkdownTextarea";
import { hashColor } from "../utils/hashColor";
import { timeAgo } from "../utils/timeAgo";
import { CustomSelect } from "../components/ui/CustomSelect";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { isAdmin } from "../utils/permissions";
import { Card } from "../components/ui/Card";

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
  likes: any[];
  comment_count: number;
};







export default function Home() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search");

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>(["unknown"]);

  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("recent");

  // Accordion state
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { user } = useAuth();

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("unknown");
  const [submitting, setSubmitting] = useState(false);

  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const handleAdminDeletePost = async (postId: number) => {
    try {
      await postsClient.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
      setDeletingPostId(null);
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (sortFilter) params.append("sort", sortFilter);

      const res = await postsClient.get(`/posts?${params.toString()}`);
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
      setShowSkeleton(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch("/forum-config.json");
      const config = await response.json();
      if (config.categories) {
        setCategories(config.categories);
        if (config.categories.includes("unknown")) {
          setNewCategory("unknown");
        } else {
          setNewCategory(config.categories[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch config", err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [searchQuery, categoryFilter, sortFilter]);

  // Delay showing the skeleton loading state by 200ms
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowSkeleton(true), 200);
    } else {
      setShowSkeleton(false);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setSubmitting(true);
      await postsClient.post("/posts", {
        title: newTitle,
        content: newContent,
        category: newCategory
      });
      setNewTitle("");
      setNewContent("");
      setIsFormOpen(false); // Close accordion on post
      await fetchPosts();
    } catch (err) {
      console.error("Failed to create post", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {searchQuery ? `Search Results for "${searchQuery}"` : "Discussions"}
        </h1>
        <div className="flex gap-3">
          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All Categories" },
              ...categories.map(c => ({ value: c, label: c }))
            ]}
            className="w-40 md:w-48"
          />
          <CustomSelect
            value={sortFilter}
            onChange={setSortFilter}
            options={[
              { value: "recent", label: "Most Recent" },
              { value: "weekly_top", label: "Top This Week" }
            ]}
            className="w-40 md:w-48"
          />
        </div>
      </div>

      {user && (
        <Card padding="p-0" className="shadow-sm flex flex-col">
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`w-full p-6 text-left flex items-center justify-between focus:outline-none hover:bg-surface-hover/50 transition-colors cursor-pointer ${isFormOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
          >
            <h2 className="text-lg font-semibold text-foreground">Start a new discussion</h2>
            <div className={`transform transition-transform duration-300 ${isFormOpen ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isFormOpen ? 'max-h-[500px] opacity-100 p-6 pt-0 border-t border-border-subtle overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <form onSubmit={handleCreatePost} className="space-y-4 pt-4 relative">
              <div>
                <input
                  type="text"
                  placeholder="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-foreground placeholder-[var(--theme-foreground-muted)]"
                  required
                />
              </div>
              <div>
                <MarkdownTextarea
                  placeholder="What's on your mind? (Markdown Supported)"
                  value={newContent}
                  onValueChange={setNewContent}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      if (!newContent.trim() || submitting) return;
                      handleCreatePost(e as unknown as React.FormEvent);
                    }
                  }}
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">Category:</label>
                <CustomSelect
                  value={newCategory}
                  onChange={setNewCategory}
                  options={categories.map(c => ({ value: c, label: c }))}
                  className="w-48"
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-foreground-muted">Markdown supported · Ctrl+Enter to submit</p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-2 text-sm font-medium text-surface shadow transition-colors hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          showSkeleton ? (
            <div className={`transition-opacity duration-500 space-y-4 ${showSkeleton ? 'opacity-100' : 'opacity-0'}`}>
              {[...Array(5)].map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </div>
          ) : (
            <div className="h-[800px]" />
          )
        ) : posts.length === 0 ? (
          <Card padding="py-12" className="text-center text-foreground-muted">
            No discussions yet. Be the first to start one!
          </Card>
        ) : (
          posts.map(post => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="block relative"
            >
              <Card hover className="relative h-full">
                {isAdmin(user) && (
                <div className="absolute top-4 right-4 z-10" onClick={(e) => e.preventDefault()}>
                  {deletingPostId === post.id ? (
                    <div className="flex items-center gap-2 bg-surface border border-red-500/30 rounded-lg px-3 py-1.5 shadow-sm">
                      <span className="text-xs font-medium text-red-500">Delete?</span>
                      <button
                        onClick={() => handleAdminDeletePost(post.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingPostId(null)}
                        className="text-xs font-bold text-foreground-muted hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded hover:bg-surface-hover transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingPostId(post.id)}
                      className="text-red-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete post (Admin)"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-border-subtle/50 text-foreground-muted capitalize">
                    {post.category}
                  </span>
                  <span className="text-xs text-foreground-muted">{timeAgo(post.created_at)}</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-brand transition-colors">
                {post.title}
              </h3>
              <p className="text-foreground-muted line-clamp-2">
                {post.content}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm text-foreground-muted">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${hashColor(post.owner.username)} flex items-center justify-center font-bold text-xs text-white uppercase`}>
                    {post.owner.username.charAt(0)}
                  </div>
                  <span>{post.owner.username}</span>
                </div>

                {/* Visual Fake Like Counter for Feeds - Real Interaction happens on Post detail*/}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span className="font-medium">{post.comment_count || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <span className="text-lg">♥</span>
                      <span className="font-medium">{post.likes?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
          ))
        )}
      </div>
    </div>
  );
}

