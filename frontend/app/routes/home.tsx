import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { postsClient } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import MarkdownTextarea from "../components/MarkdownTextarea";
import { hashColor } from "../utils/hashColor";
import { timeAgo } from "../utils/timeAgo";
import { CustomSelect } from "../components/ui/CustomSelect";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { isAdmin } from "../utils/permissions";

// ─── Types ────────────────────────────────────────────────────────────

type Post = {
  id: number;
  title: string;
  content: string;
  category: string;
  is_edited: boolean;
  owner_id: number;
  created_at: string;
  owner: { id: number; email: string; username: string };
  likes: any[];
  comment_count: number;
};

type CategoryConfig = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

type ForumStats = {
  total_posts: number;
  total_comments: number;
  total_users: number | null;
};

type ViewMode = "list" | "compact";

// ─── Utility Functions ────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s?/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

// ─── Module-Level Caches ──────────────────────────────────────────────

let categoryCountsCache: Record<string, number> | null = null;
let configCache: CategoryConfig[] | null = null;

// ─── SVG Icon Components ──────────────────────────────────────────────

const svgBase = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

function CategoryIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const p = { ...svgBase, className };
  switch (name) {
    case "message-square":
      return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "gamepad":
      return <svg {...p}><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" /></svg>;
    case "utensils":
      return <svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>;
    case "monitor":
      return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
    case "trophy":
      return <svg {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
    case "flask":
      return <svg {...p}><path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" /><path d="M10 9l-4.5 7.5A2 2 0 0 0 7.2 20h9.6a2 2 0 0 0 1.7-3.5L14 9" /></svg>;
    case "hash":
      return <svg {...p}><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="10" /></svg>;
  }
}

function FlameIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} {...svgBase}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
}

function HeartIcon({ className = "w-4 h-4", filled = false }: { className?: string; filled?: boolean }) {
  return <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}

function CommentIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} {...svgBase}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
}

function PencilIcon({ className = "w-3 h-3" }: { className?: string }) {
  return <svg className={className} {...svgBase}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>;
}

function SpinnerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>;
}

// ─── Animated Number ──────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{display}</span>;
}

// ─── Widget Heading ───────────────────────────────────────────────────

function WidgetHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted whitespace-nowrap">{children}</h3>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search");
  const { user } = useAuth();
  const { showToast } = useToast();

  // ─── State ────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("feed_view_preference") as ViewMode) || "list";
    return "list";
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [forumStats, setForumStats] = useState<ForumStats | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [displayCount, setDisplayCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showLastRead, setShowLastRead] = useState(false);
  const [lastRead, setLastRead] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────
  const formRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // ─── Derived Data ─────────────────────────────────────────────────
  const visiblePosts = useMemo(() => {
    let sorted = [...posts];
    if (sortFilter === "most_liked") sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    else if (sortFilter === "most_comments") sorted.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    return sorted.slice(0, displayCount);
  }, [posts, sortFilter, displayCount]);

  const hasMore = displayCount < posts.length;

  const activeUsers = useMemo(() => {
    if (posts.length === 0) return [];
    const userMap = new Map<number, { id: number; username: string; created_at: string }>();
    const recent = [...posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
    for (const p of recent) {
      if (!userMap.has(p.owner_id)) userMap.set(p.owner_id, { id: p.owner_id, username: p.owner.username, created_at: p.created_at });
    }
    return Array.from(userMap.values()).slice(0, 5);
  }, [posts]);

  const getCatConfig = useCallback((catId: string) => categories.find(c => c.id === catId), [categories]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleOpenForm = useCallback(() => {
    setIsFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, []);

  const handleCategoryClick = useCallback((catId: string, tabEl?: HTMLButtonElement | null) => {
    setCategoryFilter(catId);
    setDisplayCount(10);
    if (tabEl) tabEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    setTimeout(() => { setDisplayCount(prev => prev + 10); setLoadingMore(false); }, 400);
  }, []);

  const handleAdminDeletePost = async (postId: number) => {
    try {
      await postsClient.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setDeletingPostId(null);
    } catch (err) { console.error("Failed to delete post", err); }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      setSubmitting(true);
      await postsClient.post("/posts", { title: newTitle, content: newContent, category: newCategory || categories[0]?.id || "general" });
      setNewTitle(""); setNewContent(""); setIsFormOpen(false);
      showToast("Discussion posted!", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
      await fetchPosts();
    } catch (err) { console.error("Failed to create post", err); }
    finally { setSubmitting(false); }
  };

  const clearSearch = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // ─── Data Fetching ────────────────────────────────────────────────
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (sortFilter === "recent" || sortFilter === "weekly_top") params.append("sort", sortFilter);
      const res = await postsClient.get(`/posts?${params.toString()}`);
      setPosts(res.data);
    } catch (err) { console.error("Failed to fetch posts", err); }
    finally { setLoading(false); setShowSkeleton(false); }
  };

  const fetchConfig = async () => {
    if (configCache) { setCategories(configCache); setNewCategory(configCache[0]?.id || "general"); return; }
    try {
      const response = await fetch("/forum-config.json");
      const config = await response.json();
      if (config.categories && config.categories.length > 0) {
        let cats: CategoryConfig[];
        if (typeof config.categories[0] === "string") {
          cats = (config.categories as string[]).map((s: string) => ({ id: s, label: s, icon: "message-square", description: "" }));
        } else {
          cats = config.categories as CategoryConfig[];
        }
        configCache = cats;
        setCategories(cats);
        setNewCategory(cats[0]?.id || "general");
        fetchCategoryCounts(cats);
      }
    } catch (err) { console.error("Failed to fetch config", err); }
  };

  const fetchCategoryCounts = async (cats: CategoryConfig[]) => {
    if (categoryCountsCache) { setCategoryCounts(categoryCountsCache); return; }
    try {
      const results = await Promise.all(
        cats.map(c => postsClient.get(`/posts?category=${encodeURIComponent(c.id)}`).then(res => ({ id: c.id, count: res.data.length })).catch(() => ({ id: c.id, count: 0 })))
      );
      const counts: Record<string, number> = {};
      for (const r of results) counts[r.id] = r.count;
      categoryCountsCache = counts;
      setCategoryCounts(counts);
    } catch { /* silent */ }
  };

  const fetchTrendingPosts = async () => {
    try {
      setTrendingLoading(true);
      const res = await postsClient.get("/posts?sort=weekly_top");
      setTrendingPosts(res.data.slice(0, 5));
    } catch { /* silent */ }
    finally { setTrendingLoading(false); }
  };

  const fetchForumStats = async () => {
    try {
      const res = await postsClient.get("/admin/stats");
      setForumStats({ total_posts: res.data.total_posts, total_comments: res.data.total_comments, total_users: res.data.total_users });
    } catch { /* non-admin, will use fallback */ }
  };

  // ─── Effects ──────────────────────────────────────────────────────
  useEffect(() => { fetchConfig(); fetchTrendingPosts(); fetchForumStats(); }, []);
  useEffect(() => { fetchPosts(); setDisplayCount(10); }, [searchQuery, categoryFilter, sortFilter]);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) timer = setTimeout(() => setShowSkeleton(true), 200);
    else setShowSkeleton(false);
    return () => clearTimeout(timer);
  }, [loading]);
  useEffect(() => { localStorage.setItem("feed_view_preference", viewMode); }, [viewMode]);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem("ngf_last_read");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 86400000) {
            setLastRead(parsed);
            setShowLastRead(true);
          }
        } catch (e) { }
      }
    } else {
      if (!sessionStorage.getItem("ngf_welcome_dismissed")) {
        setShowWelcome(true);
      }
    }
  }, [user]);

  // Fallback stats from posts data
  useEffect(() => {
    if (!forumStats && posts.length > 0) {
      const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
      setForumStats({ total_posts: posts.length, total_comments: totalComments, total_users: null });
    }
  }, [posts, forumStats]);

  // ─── Sort Options ─────────────────────────────────────────────────
  const sortOptions = [
    { value: "recent", label: "Most Recent" },
    { value: "weekly_top", label: "Top This Week" },
    { value: "most_liked", label: "Most Liked" },
    { value: "most_comments", label: "Most Discussed" },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
      {/* ─── LEFT COLUMN ─── */}
      <div className="flex-1 min-w-0 space-y-5">

        {showWelcome && !user && (
          <div className="relative rounded-2xl bg-gradient-to-br from-brand-subtle via-transparent to-transparent border border-brand/20 p-6 mb-4 page-enter overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-brand/10 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold text-foreground mb-1">Join the conversation</h2>
                <p className="text-sm text-foreground-muted">Create an account to post, comment, like, and get notified when someone replies to you.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to="/register" className="btn-primary press-effect text-sm">Sign up free</Link>
                <Link to="/login" className="btn-ghost press-effect text-sm">Log in</Link>
              </div>
            </div>
            <button onClick={() => { sessionStorage.setItem("ngf_welcome_dismissed", "1"); setShowWelcome(false); }} className="absolute top-3 right-3 text-foreground-muted hover:text-foreground press-effect p-1.5 rounded-lg hover:bg-surface-raised transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {showLastRead && lastRead && user && (
          <div className="flex items-center gap-3 bg-brand-subtle border border-brand/20 rounded-2xl px-5 py-3 mb-4 animate-[fadeInDown_0.3s_ease-out]">
            <svg className="w-4 h-4 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            <span className="text-sm text-foreground-muted flex-1 min-w-0">
              Continue where you left off:{" "}
              <Link to={`/posts/${lastRead.postId}`} className="font-semibold text-foreground hover:text-brand transition-colors truncate">
                {lastRead.title}
              </Link>
            </span>
            <span className="tag capitalize flex-shrink-0">{lastRead.category}</span>
            <button onClick={() => { localStorage.removeItem("ngf_last_read"); setShowLastRead(false); }} className="text-foreground-muted hover:text-foreground transition-colors flex-shrink-0 press-effect p-1 rounded-lg hover:bg-surface-raised">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand/5 to-transparent p-6 -mx-2"
          style={{ animation: "fadeInUp 0.3s ease-out both" }}>
          {searchQuery ? (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                  Search results for <span className="text-brand">"{searchQuery}"</span>
                </h1>
                <button onClick={clearSearch} className="p-1.5 rounded-lg hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors cursor-pointer" title="Clear search">
                  <svg className="w-5 h-5" {...svgBase}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <p className="text-sm text-foreground-muted mt-1">{posts.length} result{posts.length !== 1 ? "s" : ""} found</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Discussions</h1>
                <p className="text-sm text-foreground-muted mt-1">
                  {posts.length} posts across {categories.length} categories
                </p>
              </div>
              {user && (
                <button onClick={handleOpenForm} className="hidden md:inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer shadow-sm">
                  <svg className="w-4 h-4" {...svgBase} stroke="white"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  New Discussion
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Category Tab Bar + Controls ── */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div ref={tabBarRef} className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 pb-1">
                {/* All tab */}
                <button
                  onClick={() => handleCategoryClick("all")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${categoryFilter === "all"
                      ? "bg-brand text-white shadow-md scale-105"
                      : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                >All</button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={(e) => handleCategoryClick(cat.id, e.currentTarget)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${categoryFilter === cat.id
                        ? "bg-brand text-white shadow-md scale-105"
                        : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                      }`}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Sort + View toggles */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <CustomSelect value={sortFilter} onChange={(v) => { setSortFilter(v); setDisplayCount(10); }} options={sortOptions} className="w-40" />
              <div className="flex items-center bg-surface border border-border-subtle rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("list")} title="List view"
                  className={`p-1.5 transition-colors cursor-pointer ${viewMode === "list" ? "bg-brand/10 text-brand" : "text-foreground-muted hover:text-foreground"}`}>
                  <svg className="w-4 h-4" {...svgBase}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                </button>
                <div className="w-px h-4 bg-border-subtle" />
                <button onClick={() => setViewMode("compact")} title="Compact view"
                  className={`p-1.5 transition-colors cursor-pointer ${viewMode === "compact" ? "bg-brand/10 text-brand" : "text-foreground-muted hover:text-foreground"}`}>
                  <svg className="w-4 h-4" {...svgBase}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><line x1="14" y1="4" x2="21" y2="4" /><line x1="14" y1="9" x2="21" y2="9" /><line x1="14" y1="15" x2="21" y2="15" /><line x1="14" y1="20" x2="21" y2="20" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Create Post Prompt Bar ── */}
        <div ref={formRef}>
          {user ? (
            <div className="card-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden">
              {!isFormOpen ? (
                <button onClick={handleOpenForm}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:border-brand/50 hover:shadow-sm transition-all cursor-pointer">
                  <div className={`w-8 h-8 rounded-full ${hashColor(user.username)} flex items-center justify-center font-bold text-xs text-white uppercase flex-shrink-0`}>
                    {user.username.charAt(0)}
                  </div>
                  <span className="text-foreground-muted text-sm flex-1 text-left">What's on your mind? Start a discussion...</span>
                  <span className="bg-brand text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">Post</span>
                </button>
              ) : (
                <div className="p-5 space-y-4 animate-[fadeInUp_0.3s_ease-out]">
                  <div>
                    <input type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                      className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all text-foreground placeholder-[var(--theme-foreground-muted)] ${newTitle.length > 200 ? "border-red-400" : "border-border-subtle"}`}
                      required />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${newTitle.length > 200 ? "text-red-400" : "text-foreground-muted"}`}>{newTitle.length} / 200</span>
                    </div>
                  </div>
                  {/* Category pill selection */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">Category:</span>
                    {categories.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setNewCategory(cat.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${newCategory === cat.id ? "bg-brand text-white shadow-sm" : "bg-surface-hover text-foreground-muted hover:text-foreground"
                          }`}>
                        <CategoryIcon name={cat.icon} className="w-3 h-3" />{cat.label}
                      </button>
                    ))}
                  </div>
                  <MarkdownTextarea placeholder="What's on your mind? (Markdown Supported)" value={newContent} onValueChange={setNewContent}
                    onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (!newContent.trim() || submitting) return; handleCreatePost(e as unknown as React.FormEvent); } }}
                    required />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-foreground-muted">Markdown supported &middot; Ctrl+Enter to submit</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setIsFormOpen(false)} className="text-sm text-foreground-muted hover:text-foreground px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Cancel</button>
                      <button onClick={handleCreatePost} disabled={submitting}
                        className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        {submitting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate("/login")}
              className="w-full flex items-center gap-3 card-surface rounded-xl border border-border-subtle px-4 py-3 hover:border-brand/50 hover:shadow-sm transition-all cursor-pointer shadow-sm">
              <div className="w-8 h-8 rounded-full bg-border-subtle flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-foreground-muted" {...svgBase}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <span className="text-foreground-muted text-sm">Join the conversation &mdash; Log in or Sign up to post</span>
            </button>
          )}
        </div>

        {/* ── Post Feed ── */}
        <div className="space-y-3">
          {loading ? (
            showSkeleton ? (
              <div className="transition-opacity duration-500 space-y-3 opacity-100">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} index={i} />)}
              </div>
            ) : <div className="h-[800px]" />
          ) : posts.length === 0 ? (
            <div className="card-surface rounded-xl border border-border-subtle p-12 text-center text-foreground-muted shadow-sm">
              No discussions yet. Be the first to start one!
            </div>
          ) : (
            visiblePosts.map((post, index) => {
              const catConf = getCatConfig(post.category);
              const catColor = hashColor(post.category);
              const isHot = (post.likes?.length || 0) > 10 || (post.comment_count || 0) > 15;

              if (viewMode === "compact") {
                // ─── Compact View ───
                return (
                  <Link key={post.id} to={`/posts/${post.id}`} className="block group"
                    onClick={() => localStorage.setItem("ngf_last_read", JSON.stringify({ postId: post.id, title: post.title, category: post.category, timestamp: Date.now() }))}
                    style={{ animation: `fadeInUp 0.3s ease-out ${index * 40}ms both` }}>
                    <div className={`flex items-center gap-3 card-surface hover-shadow-brand rounded-lg border border-border-subtle py-3 px-4 shadow-sm hover:shadow-lg transition-all duration-200 group-hover:-translate-y-0.5 border-l-4`}
                      style={{ borderLeftColor: `var(--tw-${catColor.replace("bg-", "")}, currentColor)` }}>
                      <CategoryIcon name={catConf?.icon || "message-square"} className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                      <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors truncate flex-1 leading-snug">
                        {isHot && <FlameIcon className="w-3.5 h-3.5 inline text-orange-400 mr-1" />}
                        {post.title}
                      </h3>
                      <span className="text-xs text-foreground-muted capitalize whitespace-nowrap">{post.category}</span>
                      <span className="text-xs text-foreground-muted whitespace-nowrap">{timeAgo(post.created_at)}</span>
                      <div className="flex items-center gap-3 text-xs text-foreground-muted flex-shrink-0">
                        <span className="flex items-center gap-1"><CommentIcon className="w-3.5 h-3.5" />{post.comment_count || 0}</span>
                        <span className="flex items-center gap-1">
                          <HeartIcon className="w-3.5 h-3.5" filled={(post.likes?.length || 0) > 0} />{post.likes?.length || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }

              // ─── List View ───
              return (
                <Link key={post.id} to={`/posts/${post.id}`} className="block group"
                  onClick={() => localStorage.setItem("ngf_last_read", JSON.stringify({ postId: post.id, title: post.title, category: post.category, timestamp: Date.now() }))}
                  style={{ animation: `fadeInUp 0.3s ease-out ${index * 40}ms both` }}>
                  <div className="relative overflow-hidden rounded-xl">
                    {/* Gradient top border on hover */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand to-brand/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    <div className="card-surface hover-shadow-brand rounded-xl border border-border-subtle p-5 shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200">
                      {/* Admin delete */}
                      {isAdmin(user) && (
                        <div className="absolute top-4 right-4 z-10" onClick={(e) => e.preventDefault()}>
                          {deletingPostId === post.id ? (
                            <div className="flex items-center gap-2 bg-surface border border-red-500/30 rounded-lg px-3 py-1.5 shadow-sm">
                              <span className="text-xs font-medium text-red-500">Delete?</span>
                              <button onClick={() => handleAdminDeletePost(post.id)} className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors">Yes</button>
                              <button onClick={() => setDeletingPostId(null)} className="text-xs font-bold text-foreground-muted hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded hover:bg-surface-hover transition-colors">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingPostId(post.id)} className="text-red-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Delete post (Admin)">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </button>
                          )}
                        </div>
                      )}
                      {/* Top row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-border-subtle/50 text-foreground-muted capitalize">
                          <CategoryIcon name={catConf?.icon || "message-square"} className="w-3 h-3" />
                          {post.category}
                        </span>
                        <span className="text-xs text-foreground-muted">&middot;</span>
                        <span className="text-xs text-foreground-muted">{timeAgo(post.created_at)}</span>
                        <span className="text-xs text-foreground-muted">
                          &middot; {Math.max(1, Math.ceil(stripMarkdown(post.content).split(/\s+/).length / 200))} min read
                        </span>
                        {post.is_edited && (
                          <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                            <PencilIcon className="w-3 h-3" /> Edited
                          </span>
                        )}
                      </div>
                      {/* Title */}
                      <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-brand transition-colors line-clamp-2">
                        {isHot && <FlameIcon className="w-4 h-4 inline text-orange-400 mr-1" />}
                        {post.title}
                      </h3>
                      {/* Content preview */}
                      <p className="text-sm text-foreground-muted line-clamp-2 mt-1">{stripMarkdown(post.content)}</p>
                      {/* Bottom row */}
                      <div className="mt-3 flex items-center text-sm text-foreground-muted">
                        <div className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/users/${post.owner_id}`); }}>
                          <div className={`w-6 h-6 rounded-full ${hashColor(post.owner.username)} flex items-center justify-center font-bold text-xs text-white uppercase`}>
                            {post.owner.username.charAt(0)}
                          </div>
                          <span className="truncate max-w-[120px] hover:text-brand transition-colors cursor-pointer">{post.owner.username}</span>
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5"><CommentIcon className="w-4 h-4" /><span className="font-medium">{post.comment_count || 0}</span></div>
                          <div className="flex items-center gap-1.5">
                            <HeartIcon className="w-4 h-4" filled={(post.likes?.length || 0) > 0} />
                            <span className="font-medium">{post.likes?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* ── Load More ── */}
        {!loading && hasMore && (
          <div className="flex justify-center pt-2">
            <button onClick={handleLoadMore} disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-full border border-border-subtle text-sm font-medium text-foreground-muted hover:border-brand hover:text-brand transition-all cursor-pointer disabled:opacity-50">
              {loadingMore ? <><SpinnerIcon className="w-4 h-4" /><span className="shimmer-text">Loading...</span></> : "Load More"}
            </button>
          </div>
        )}
        {!loading && !hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-foreground-muted py-4">You've reached the end &middot; {posts.length} discussions</p>
        )}
      </div>

      {/* ─── RIGHT COLUMN (SIDEBAR) ─── */}
      <div className="hidden lg:flex flex-col gap-5 w-72 xl:w-80 sticky top-20">

        {/* ── Community Stats Widget ── */}
        {forumStats && (
          <div className="card-surface rounded-xl border border-border-subtle border-l-4 border-l-brand/40 shadow-sm p-4"
            style={{ animation: "fadeInUp 0.3s ease-out 100ms both" }}>
            <WidgetHeading>Community Stats</WidgetHeading>
            <div className="grid grid-cols-3 gap-3">
              <div className="border-t-2 border-brand pt-2">
                <div className="font-bold text-foreground text-lg"><AnimatedNumber value={forumStats.total_posts} /></div>
                <div className="text-xs text-foreground-muted">Posts</div>
              </div>
              <div className="border-t-2 border-green-500 pt-2">
                <div className="font-bold text-foreground text-lg"><AnimatedNumber value={forumStats.total_comments} /></div>
                <div className="text-xs text-foreground-muted">Comments</div>
              </div>
              <div className="border-t-2 border-violet-500 pt-2">
                <div className="font-bold text-foreground text-lg">{forumStats.total_users != null ? <AnimatedNumber value={forumStats.total_users} /> : <span>&mdash;</span>}</div>
                <div className="text-xs text-foreground-muted">Members</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Browse Categories Widget ── */}
        {categories.length > 0 && (
          <div className="card-surface rounded-xl border border-border-subtle border-l-4 border-l-brand/40 shadow-sm p-4"
            style={{ animation: "fadeInUp 0.3s ease-out 200ms both" }}>
            <WidgetHeading>Browse Categories</WidgetHeading>
            <div className="space-y-0.5">
              {/* All Categories */}
              <button onClick={() => handleCategoryClick("all")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${categoryFilter === "all" ? "bg-brand/10 text-brand font-semibold border-l-2 border-brand -ml-px" : "text-foreground hover:bg-surface-hover"
                  }`}>
                <div className="w-3 h-3 rounded-sm bg-foreground-muted/30" />
                <span className="capitalize font-medium flex-1 text-left">All Categories</span>
              </button>
              {categories.map(cat => {
                const catBg = hashColor(cat.id);
                return (
                  <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${categoryFilter === cat.id ? "bg-brand/10 text-brand font-semibold border-l-2 border-brand -ml-px" : "text-foreground hover:bg-surface-hover"
                      }`}>
                    <div className={`w-6 h-6 rounded-md ${catBg} flex items-center justify-center`}>
                      <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="capitalize font-medium flex-1 text-left">{cat.label}</span>
                    <span className="text-xs text-foreground-muted tabular-nums">{categoryCounts[cat.id] ?? ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trending This Week Widget ── */}
        {(trendingLoading || trendingPosts.length >= 3) && (
          <div className="card-surface rounded-xl border border-border-subtle border-l-4 border-l-brand/40 shadow-sm p-4"
            style={{ animation: "fadeInUp 0.3s ease-out 300ms both" }}>
            <WidgetHeading>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" {...svgBase}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                Trending This Week
              </span>
            </WidgetHeading>
            {trendingLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-6 bg-border-subtle rounded" />
                    <div className="flex-1 space-y-1.5"><div className="h-3.5 bg-border-subtle rounded w-full" /><div className="h-2.5 bg-border-subtle rounded w-2/3" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {trendingPosts.map((tp, i) => (
                  <Link key={tp.id} to={`/posts/${tp.id}`}
                    className={`flex items-start gap-3 py-2.5 group/trend ${i < trendingPosts.length - 1 ? "border-b border-border-subtle" : ""}`}>
                    <span className="text-3xl font-black text-border-subtle/40 leading-none select-none w-8 text-right flex-shrink-0 relative -top-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground group-hover/trend:text-brand transition-colors line-clamp-2 leading-snug">{tp.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-foreground-muted">
                        <span className="px-1.5 py-0.5 rounded bg-border-subtle/50 capitalize">{tp.category}</span>
                        <span className="flex items-center gap-0.5"><HeartIcon className="w-2.5 h-2.5" />{tp.likes?.length || 0}</span>
                        <span className="flex items-center gap-0.5"><CommentIcon className="w-2.5 h-2.5" />{tp.comment_count || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Recently Active Widget ── */}
        {activeUsers.length > 0 && (
          <div className="card-surface rounded-xl border border-border-subtle border-l-4 border-l-brand/40 shadow-sm p-4"
            style={{ animation: "fadeInUp 0.3s ease-out 400ms both" }}>
            <WidgetHeading>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" {...svgBase}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Recently Active
              </span>
            </WidgetHeading>
            <div className="space-y-2">
              {activeUsers.map(au => (
                <Link key={au.id} to={`/users/${au.id}`} className="flex items-center gap-2.5 py-1 group/user">
                  <div className={`w-7 h-7 rounded-full ${hashColor(au.username)} flex items-center justify-center font-bold text-[10px] text-white uppercase flex-shrink-0`}>
                    {au.username.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground group-hover/user:text-brand transition-colors truncate">{au.username}</div>
                    <div className="text-xs text-foreground-muted">Posted {timeAgo(au.created_at)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
