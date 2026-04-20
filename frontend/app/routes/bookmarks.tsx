import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { hashColor } from "../utils/hashColor";
import { timeAgo } from "../utils/timeAgo";

export default function Bookmarks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);

  useEffect(() => {
    // Redirect if not logged in
    if (!user) { navigate("/login"); return; }
    
    // Read from localStorage
    let ids: number[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("ngf_bookmarks") || "[]");
    } catch { ids = []; }
    setBookmarkIds(ids);
    
    if (ids.length === 0) { setLoading(false); return; }
    
    // Fetch all posts then filter client-side
    // Use the existing posts API — fetch all and filter by ID
    // This avoids needing a new backend endpoint
    postsClient.get("/posts").then((res: any) => {
      const bookmarked = res.data.filter((p: any) => ids.includes(p.id));
      setPosts(bookmarked);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user, navigate]);

  const removeBookmark = (postId: number) => {
    const next = bookmarkIds.filter(id => id !== postId);
    setBookmarkIds(next);
    setPosts(prev => prev.filter((p: any) => p.id !== postId));
    localStorage.setItem("ngf_bookmarks", JSON.stringify(next));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground 
                         flex items-center gap-2.5">
            {/* Bookmark icon SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 strokeLinejoin="round" className="text-brand">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Saved Posts
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            {posts.length} saved {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
        
        {bookmarkIds.length > 0 && (
          <button
            onClick={() => {
              localStorage.removeItem("ngf_bookmarks");
              setBookmarkIds([]);
              setPosts([]);
            }}
            className="btn-ghost text-sm press-effect text-foreground-muted hover:text-foreground cursor-pointer px-4 py-2 rounded-lg"
          >
            Clear all
          </button>
        )}
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 skeleton-shimmer rounded-2xl"
                 style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-subtle
                        p-16 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted opacity-25"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">
            No saved posts yet
          </h2>
          <p className="text-sm text-foreground-muted mb-6">
            Bookmark posts you want to read later by clicking the 
            bookmark icon on any post card.
          </p>
          <Link to="/" className="btn-primary press-effect text-sm px-6 py-2.5">
            Browse discussions
          </Link>
        </div>
      )}
      
      {/* Post list */}
      {!loading && posts.length > 0 && (
        <div className="space-y-3 stagger-children">
          {posts.map((post: any) => (
            <div key={post.id} className="relative group">
              <Link to={`/posts/${post.id}`} className="block">
                <div className="card-surface card-hover border-glow rounded-2xl
                                border border-border-subtle p-5 shadow-sm">
                  
                  {/* Top metadata */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag capitalize">{post.category}</span>
                    <span className="text-xs text-foreground-muted">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-display font-bold text-[1.05rem]
                                 text-foreground group-hover:text-brand
                                 transition-colors line-clamp-2 mb-1">
                    {post.title}
                  </h3>
                  
                  {/* Author + stats */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${hashColor(post.owner?.username || "")}
                                      flex items-center justify-center text-white text-[10px] font-bold`}>
                        {(post.owner?.username || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-foreground-muted">
                        {post.owner?.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      <span>{post.likes?.length || 0} likes</span>
                      <span>{post.comment_count || 0} comments</span>
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Remove bookmark button */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeBookmark(post.id); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg
                           text-brand bg-brand-subtle press-effect
                           opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 opacity-100
                           transition-all duration-200 cursor-pointer"
                title="Remove bookmark"
              >
                <svg width="14" height="14" viewBox="0 0 24 24"
                     fill="currentColor" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
