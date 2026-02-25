import { useEffect, useState } from "react";
import { Link } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";

type Post = {
  id: number;
  title: string;
  content: string;
  owner_id: number;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await postsClient.get("/posts");
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setSubmitting(true);
      await postsClient.post("/posts", {
        title: newTitle,
        content: newContent
      });
      setNewTitle("");
      setNewContent("");
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Discussions</h1>
      </div>

      {user && (
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-border-subtle">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Start a new discussion</h2>
          <form onSubmit={handleCreatePost} className="space-y-4">
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
              <textarea
                placeholder="What's on your mind?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-[100px] text-foreground placeholder-[var(--theme-foreground-muted)]"
                required
              />
            </div>
            <div className="flex justify-end">
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
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-foreground-muted animate-pulse">Loading discussions...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border-subtle text-foreground-muted">
            No discussions yet. Be the first to start one!
          </div>
        ) : (
          posts.map(post => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="block bg-surface p-6 rounded-xl border border-border-subtle hover:border-brand/40 hover:shadow-md transition-all group"
            >
              <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-brand transition-colors">
                {post.title}
              </h3>
              <p className="text-foreground-muted line-clamp-2">
                {post.content}
              </p>
              <div className="mt-4 flex items-center text-sm text-foreground-muted">
                <span>By User #{post.owner_id}</span>
                <span className="mx-2">•</span>
                <span>Click to view discussion</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
