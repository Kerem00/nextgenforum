import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usersClient, postsClient } from "../api";
import { hashColor } from "../utils/hashColor";

// ── F1-A: Accent color palette
export const ACCENT_COLORS = [
  {
    id: "violet",
    label: "Violet",
    light: { brand: "#7c3aed", hover: "#6d28d9", glow: "rgba(124,58,237,0.18)", subtle: "rgba(124,58,237,0.08)", muted: "#c4b5fd" },
    dark:  { brand: "#a78bfa", hover: "#8b5cf6", glow: "rgba(167,139,250,0.22)", subtle: "rgba(167,139,250,0.10)", muted: "#6d28d9" },
  },
  {
    id: "blue",
    label: "Blue",
    light: { brand: "#2563eb", hover: "#1d4ed8", glow: "rgba(37,99,235,0.18)", subtle: "rgba(37,99,235,0.08)", muted: "#93c5fd" },
    dark:  { brand: "#60a5fa", hover: "#3b82f6", glow: "rgba(96,165,250,0.22)", subtle: "rgba(96,165,250,0.10)", muted: "#1d4ed8" },
  },
  {
    id: "emerald",
    label: "Emerald",
    light: { brand: "#059669", hover: "#047857", glow: "rgba(5,150,105,0.18)", subtle: "rgba(5,150,105,0.08)", muted: "#6ee7b7" },
    dark:  { brand: "#34d399", hover: "#10b981", glow: "rgba(52,211,153,0.22)", subtle: "rgba(52,211,153,0.10)", muted: "#047857" },
  },
  {
    id: "rose",
    label: "Rose",
    light: { brand: "#e11d48", hover: "#be123c", glow: "rgba(225,29,72,0.18)", subtle: "rgba(225,29,72,0.08)", muted: "#fda4af" },
    dark:  { brand: "#fb7185", hover: "#f43f5e", glow: "rgba(251,113,133,0.22)", subtle: "rgba(251,113,133,0.10)", muted: "#be123c" },
  },
  {
    id: "amber",
    label: "Amber",
    light: { brand: "#d97706", hover: "#b45309", glow: "rgba(217,119,6,0.18)", subtle: "rgba(217,119,6,0.08)", muted: "#fcd34d" },
    dark:  { brand: "#fbbf24", hover: "#f59e0b", glow: "rgba(251,191,36,0.22)", subtle: "rgba(251,191,36,0.10)", muted: "#b45309" },
  },
  {
    id: "cyan",
    label: "Cyan",
    light: { brand: "#0891b2", hover: "#0e7490", glow: "rgba(8,145,178,0.18)", subtle: "rgba(8,145,178,0.08)", muted: "#67e8f9" },
    dark:  { brand: "#22d3ee", hover: "#06b6d4", glow: "rgba(34,211,238,0.22)", subtle: "rgba(34,211,238,0.10)", muted: "#0e7490" },
  },
  {
    id: "pink",
    label: "Pink",
    light: { brand: "#db2777", hover: "#be185d", glow: "rgba(219,39,119,0.18)", subtle: "rgba(219,39,119,0.08)", muted: "#f9a8d4" },
    dark:  { brand: "#f472b6", hover: "#ec4899", glow: "rgba(244,114,182,0.22)", subtle: "rgba(244,114,182,0.10)", muted: "#be185d" },
  },
  {
    id: "orange",
    label: "Orange",
    light: { brand: "#ea580c", hover: "#c2410c", glow: "rgba(234,88,12,0.18)", subtle: "rgba(234,88,12,0.08)", muted: "#fdba74" },
    dark:  { brand: "#fb923c", hover: "#f97316", glow: "rgba(251,146,60,0.22)", subtle: "rgba(251,146,60,0.10)", muted: "#c2410c" },
  },
] as const;

export type AccentColorId = typeof ACCENT_COLORS[number]["id"];

// ── F1-B: Apply accent color to CSS variables
export function applyAccentColor(colorId: AccentColorId) {
  const color = ACCENT_COLORS.find(c => c.id === colorId);
  if (!color) return;

  const isDark =
    document.documentElement.classList.contains("dark") ||
    (!document.documentElement.classList.contains("light") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const values = isDark ? color.dark : color.light;
  const root = document.documentElement;

  root.style.setProperty("--theme-brand",        values.brand);
  root.style.setProperty("--theme-brand-hover",  values.hover);
  root.style.setProperty("--theme-brand-glow",   values.glow);
  root.style.setProperty("--theme-brand-subtle", values.subtle);
  root.style.setProperty("--theme-brand-muted",  values.muted);

  localStorage.setItem("ngf_accent_color", colorId);
}

type Tab = "profile" | "privacy" | "account" | "appearance";

type ProfileMeta = {
  bio: string;
  location: string;
  website: string;
  twitter: string;
  github: string;
  privacy?: {
    showLocation: boolean;
    showWebsite: boolean;
    showTwitter: boolean;
    showGithub: boolean;
    showActivity?: boolean;
  };
};

export default function EditProfile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ── Auth guard
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // ── Active tab
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Unsaved changes tracking
  const [hasChanges, setHasChanges] = useState(false);

  // ── Saving state
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ── Profile meta state (persisted to localStorage)
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>(() => {
    try {
      return JSON.parse(localStorage.getItem("ngf_profile_meta") || "{}");
    } catch {
      return {} as ProfileMeta;
    }
  });

  useEffect(() => {
    if (user) {
      postsClient.get(`/users/${user.id}`).then((res) => {
        if (res.data.profile_meta) {
          setProfileMeta(res.data.profile_meta);
          localStorage.setItem("ngf_profile_meta", JSON.stringify(res.data.profile_meta));
        }
      }).catch(err => console.error(err));
    }
  }, [user]);

  // Helper to update a single field and mark changes
  const updateMeta = (field: keyof ProfileMeta, value: any) => {
    setProfileMeta(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updatePrivacy = (field: keyof Required<ProfileMeta>["privacy"], value: boolean) => {
    setProfileMeta(prev => ({
      ...prev,
      privacy: {
        ...(prev.privacy || {
          showLocation: true,
          showWebsite: true,
          showTwitter: true,
          showGithub: true,
          showActivity: true,
        }),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // ── Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Appearance state
  // Read from localStorage — same keys used by the rest of the app
  const [themePreference, setThemePreference] = useState<
    "light" | "dark" | "system"
  >(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return "dark";
    if (saved === "light") return "light";
    return "system";
  });

  const [feedView, setFeedView] = useState<"list" | "compact">(() => {
    return (localStorage.getItem("feed_view_preference") as any) || "list";
  });

  // ── F1-D: Accent color state
  const [accentColor, setAccentColor] = useState<AccentColorId>(() => {
    return (localStorage.getItem("ngf_accent_color") as AccentColorId) || "violet";
  });

  const handleAccentChange = (colorId: AccentColorId) => {
    setAccentColor(colorId);
    applyAccentColor(colorId);
    setHasChanges(true);
  };

  // ── Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ── Unsaved changes browser warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  // ── Apply theme immediately when changed in appearance tab
  const applyTheme = (t: "light" | "dark" | "system") => {
    setThemePreference(t);
    setHasChanges(true);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else if (t === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("dark", "light");
      localStorage.removeItem("theme");
    }
  };

  // ── Save handler
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      await usersClient.patch("/users/me/profile_meta", { profile_meta: profileMeta });
      localStorage.setItem("ngf_profile_meta", JSON.stringify(profileMeta));
    } catch (err) {
      console.error(err);
      showToast("Failed to save to database.", "error");
      setSaving(false);
      return;
    }

    // Persist feed view
    localStorage.setItem("feed_view_preference", feedView);

    setSaving(false);
    setSavedSuccess(true);
    setHasChanges(false);
    showToast("Settings saved!", "success");

    setTimeout(() => setSavedSuccess(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto page-enter pb-24">

      {/* ── Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Link
            to={`/users/${user.id}`}
            className="text-foreground-muted hover:text-brand transition-colors
                       press-effect p-1.5 rounded-lg hover:bg-brand-subtle"
          >
            {/* Left arrow SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Settings
          </h1>
        </div>
        <p className="text-sm text-foreground-muted pl-10">
          @{user.username}
        </p>
      </div>

      {/* ── Main layout: left nav + right content */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* ── Left nav tabs */}
        {/* Mobile: horizontal scrollable tabs */}
        {/* Desktop: vertical sticky nav */}
        <nav className="
          w-full md:w-48 flex-shrink-0
          flex md:flex-col
          flex-row overflow-x-auto scrollbar-hide
          md:sticky md:top-24
          gap-1 md:gap-0.5
          pb-1 md:pb-0
        ">
          {([
            {
              id: "profile",
              label: "Profile",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ),
            },
            {
              id: "privacy",
              label: "Privacy",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
            },
            {
              id: "account",
              label: "Account",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
            },
            {
              id: "appearance",
              label: "Appearance",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ),
            },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm
                font-medium transition-all duration-150 press-effect
                whitespace-nowrap cursor-pointer w-full text-left
                ${activeTab === tab.id
                  ? "bg-brand-subtle text-brand font-semibold"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-raised"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Right content panel */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ════════════════════════════════════
              PROFILE TAB
          ════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-[fadeInUp_0.2s_ease-out]">

              {/* Avatar section */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6">
                <h2 className="font-display font-bold text-foreground mb-5 
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Avatar
                </h2>
                <div className="flex items-center gap-5">
                  {/* Current avatar */}
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center
                               font-display font-black text-3xl text-white
                               glow-brand-sm flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--theme-brand), #8b5cf6)",
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Profile picture
                    </p>
                    <p className="text-xs text-foreground-muted leading-relaxed">
                      Avatar upload coming soon. Your initial avatar is 
                      generated automatically from your username.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile info fields */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-5">
                <h2 className="font-display font-bold text-foreground 
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Profile Information
                </h2>

                {/* Username — read only */}
                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={user.username}
                      readOnly
                      className="input-base opacity-60 cursor-not-allowed"
                      style={{ paddingRight: "2.5rem" }}
                    />
                    {/* Lock icon */}
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-foreground-muted"
                      title="Contact admin to change your username"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" strokeWidth="2"
                           strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted mt-1.5">
                    Contact an admin to change your username.
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold uppercase
                                      tracking-widest text-foreground-muted
                                      font-display">
                      Bio
                    </label>
                    <span className={`text-xs tabular-nums ${
                      (profileMeta.bio?.length || 0) > 280
                        ? "text-red-500"
                        : "text-foreground-muted"
                    }`}>
                      {profileMeta.bio?.length || 0} / 300
                    </span>
                  </div>
                  <textarea
                    value={profileMeta.bio || ""}
                    onChange={e => updateMeta("bio", e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Tell the community a bit about yourself..."
                    className="input-base resize-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Location
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2
                                 w-4 h-4 text-foreground-muted pointer-events-none"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <input
                      type="text"
                      value={profileMeta.location || ""}
                      onChange={e => updateMeta("location", e.target.value)}
                      maxLength={60}
                      placeholder="City, Country"
                      className="input-base"
                      style={{ paddingLeft: "2.5rem" }}
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Website
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2
                                 w-4 h-4 text-foreground-muted pointer-events-none"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
                               15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <input
                      type="url"
                      value={profileMeta.website || ""}
                      onChange={e => updateMeta("website", e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="input-base"
                      style={{ paddingLeft: "2.5rem" }}
                    />
                  </div>
                </div>

                {/* Social links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Twitter/X */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase
                                      tracking-widest text-foreground-muted mb-2
                                      font-display">
                      Twitter / X
                    </label>
                    <div className="relative">
                      {/* X (Twitter) icon SVG */}
                      <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2
                                   w-3.5 h-3.5 text-foreground-muted pointer-events-none"
                        viewBox="0 0 24 24" fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <input
                        type="text"
                        value={profileMeta.twitter || ""}
                        onChange={e => updateMeta("twitter", e.target.value)}
                        placeholder="username"
                        className="input-base"
                        style={{ paddingLeft: "2.5rem" }}
                      />
                    </div>
                  </div>

                  {/* GitHub */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase
                                      tracking-widest text-foreground-muted mb-2
                                      font-display">
                      GitHub
                    </label>
                    <div className="relative">
                      {/* GitHub icon SVG */}
                      <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2
                                   w-4 h-4 text-foreground-muted pointer-events-none"
                        viewBox="0 0 24 24" fill="currentColor"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795
                          8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23
                          -.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345
                          -.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945
                          -.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495
                          .99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46
                          -5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12
                          -3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s
                          2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24
                          2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805
                          5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015
                          2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24
                          12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <input
                        type="text"
                        value={profileMeta.github || ""}
                        onChange={e => updateMeta("github", e.target.value)}
                        placeholder="username"
                        className="input-base"
                        style={{ paddingLeft: "2.5rem" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              PRIVACY TAB
          ════════════════════════════════════ */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-[fadeInUp_0.2s_ease-out]">
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-5">
                <h2 className="font-display font-bold text-foreground 
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Privacy Settings
                </h2>
                <p className="text-sm text-foreground-muted -mt-2">
                  Choose which information you want to display on your public profile.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {[
                    { key: "showLocation", label: "Show Location", icon: "📍" },
                    { key: "showWebsite", label: "Show Website", icon: "🔗" },
                    { key: "showTwitter", label: "Show Twitter / X", icon: "X" },
                    { key: "showGithub", label: "Show GitHub", icon: "GH" },
                    { key: "showActivity", label: "Show Activity", icon: "📈" },
                  ].map((pref) => (
                    <label 
                      key={pref.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-border-subtle hover:border-brand/30 hover:bg-brand/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{pref.icon}</span>
                        <span className="text-sm font-medium text-foreground">{pref.label}</span>
                      </div>
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-border-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 has-[:checked]:bg-brand">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={profileMeta.privacy?.[pref.key as keyof Required<ProfileMeta>["privacy"]] ?? true}
                          onChange={(e) => updatePrivacy(pref.key as any, e.target.checked)}
                        />
                        <span className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform translate-x-0.5 peer-checked:translate-x-5.5" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              ACCOUNT TAB
          ════════════════════════════════════ */}
          {activeTab === "account" && (
            <div className="space-y-6 animate-[fadeInUp_0.2s_ease-out]">

              {/* Email — read only */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
                <h2 className="font-display font-bold text-foreground
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Email Address
                </h2>
                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Current Email
                  </label>
                  <input
                    type="text"
                    value={(() => {
                      // Mask email: show j***@gmail.com
                      const email = user.email || "";
                      const [local, domain] = email.split("@");
                      if (!domain) return email;
                      return `${local[0]}${"*".repeat(
                        Math.min(local.length - 1, 4)
                      )}@${domain}`;
                    })()}
                    readOnly
                    className="input-base opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Change password */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
                <h2 className="font-display font-bold text-foreground
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Change Password
                </h2>

                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="input-base"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="input-base"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase
                                    tracking-widest text-foreground-muted mb-2
                                    font-display">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`input-base ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                    autoComplete="new-password"
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1.5">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      showToast("Please fill in all password fields.", "error");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      showToast("Passwords do not match.", "error");
                      return;
                    }
                    if (newPassword.length < 6) {
                      showToast(
                        "New password must be at least 6 characters.",
                        "error"
                      );
                      return;
                    }
                    // Real API call integration point:
                    // await usersClient.patch("/users/password", { currentPassword, newPassword })
                    // For now, show coming soon:
                    showToast(
                      "Password change coming soon.",
                      "info"
                    );
                  }}
                  className="btn-ghost text-sm press-effect cursor-pointer"
                >
                  Update Password
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-surface rounded-2xl border border-red-500/20 p-6 space-y-4">
                <h2 className="font-display font-bold text-red-500
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-red-500 inline-block"/>
                  Danger Zone
                </h2>
                <p className="text-sm text-foreground-muted">
                  Permanently delete your account and all of your content.
                  This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5
                             rounded-xl border border-red-500/30 text-red-500
                             text-sm font-semibold hover:bg-red-500/8
                             transition-all press-effect cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3
                             0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              APPEARANCE TAB
          ════════════════════════════════════ */}
          {activeTab === "appearance" && (
            <div className="space-y-6 animate-[fadeInUp_0.2s_ease-out]">

              {/* ── F1-E: Accent Color card — above Theme card */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-5">
                <div>
                  <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-brand inline-block" />
                    Accent Color
                  </h2>
                  <p className="text-sm text-foreground-muted mt-1">
                    Personalizes buttons, links, highlights, and interactive elements
                    across the entire forum.
                  </p>
                </div>

                {/* Color grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => handleAccentChange(color.id)}
                      title={color.label}
                      className={`
                        relative flex flex-col items-center gap-2 p-2 rounded-2xl
                        border-2 transition-all duration-200 press-effect cursor-pointer
                        ${
                          accentColor === color.id
                            ? "border-current scale-105"
                            : "border-transparent hover:border-border-strong hover:scale-105"
                        }
                      `}
                      style={{ color: color.light.brand }}
                    >
                      {/* Color swatch */}
                      <div
                        className="w-10 h-10 rounded-xl shadow-md transition-all duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${color.light.brand}, ${color.dark.brand})`,
                          boxShadow: accentColor === color.id
                            ? `0 4px 16px -4px ${color.light.glow}`
                            : undefined,
                        }}
                      />
                      {/* Label */}
                      <span className="text-[10px] font-semibold font-display text-foreground-muted">
                        {color.label}
                      </span>
                      {/* Active checkmark */}
                      {accentColor === color.id && (
                        <div
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: color.light.brand }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                               stroke="white" strokeWidth="3.5"
                               strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Live preview strip */}
                <div className="rounded-xl border border-border-subtle p-4 space-y-3 bg-background">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground-muted font-display">
                    Preview
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button className="btn-primary text-sm press-effect py-2 px-4">
                      Primary button
                    </button>
                    <button className="btn-ghost text-sm press-effect py-2 px-4">
                      Ghost button
                    </button>
                    <span className="tag">Category tag</span>
                    <span className="text-brand text-sm font-semibold underline underline-offset-2 cursor-pointer">
                      Link text
                    </span>
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
                <h2 className="font-display font-bold text-foreground
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Theme
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  {([
                    {
                      id: "light",
                      label: "Light",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="5"/>
                          <line x1="12" y1="1" x2="12" y2="3"/>
                          <line x1="12" y1="21" x2="12" y2="23"/>
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                          <line x1="1" y1="12" x2="3" y2="12"/>
                          <line x1="21" y1="12" x2="23" y2="12"/>
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                      ),
                    },
                    {
                      id: "dark",
                      label: "Dark",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21
                                   12.79z"/>
                        </svg>
                      ),
                    },
                    {
                      id: "system",
                      label: "System",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      ),
                    },
                  ] as { id: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[])
                    .map(option => (
                      <button
                        key={option.id}
                        onClick={() => applyTheme(option.id)}
                        className={`
                          flex flex-col items-center gap-2.5 p-4 rounded-2xl
                          border-2 transition-all duration-200 press-effect cursor-pointer
                          ${themePreference === option.id
                            ? "border-brand bg-brand-subtle text-brand"
                            : "border-border-subtle hover:border-border-strong text-foreground-muted hover:text-foreground"
                          }
                        `}
                      >
                        {option.icon}
                        <span className="text-xs font-semibold font-display">
                          {option.label}
                        </span>
                        {themePreference === option.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {/* Feed view */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
                <h2 className="font-display font-bold text-foreground
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Feed Layout
                </h2>
                <p className="text-sm text-foreground-muted -mt-1">
                  Choose how posts appear on the homepage.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {([
                    {
                      id: "list",
                      label: "List",
                      description: "Full cards with preview",
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6"/>
                          <line x1="8" y1="12" x2="21" y2="12"/>
                          <line x1="8" y1="18" x2="21" y2="18"/>
                          <line x1="3" y1="6" x2="3.01" y2="6"/>
                          <line x1="3" y1="12" x2="3.01" y2="12"/>
                          <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                      ),
                    },
                    {
                      id: "compact",
                      label: "Compact",
                      description: "Dense rows, more posts",
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                          <line x1="3" y1="14" x2="21" y2="14"/>
                          <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                      ),
                    },
                  ] as { id: "list" | "compact"; label: string; description: string; icon: React.ReactNode }[])
                    .map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setFeedView(option.id);
                          setHasChanges(true);
                        }}
                        className={`
                          flex flex-col items-start gap-2 p-4 rounded-2xl
                          border-2 transition-all duration-200 press-effect cursor-pointer
                          text-left
                          ${feedView === option.id
                            ? "border-brand bg-brand-subtle"
                            : "border-border-subtle hover:border-border-strong"
                          }
                        `}
                      >
                        <div className={feedView === option.id
                          ? "text-brand" : "text-foreground-muted"}>
                          {option.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold font-display ${
                            feedView === option.id
                              ? "text-brand" : "text-foreground"
                          }`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Language — placeholder */}
              <div className="bg-surface rounded-2xl border border-border-subtle p-6">
                <h2 className="font-display font-bold text-foreground mb-1
                               flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-brand inline-block"/>
                  Language
                </h2>
                <p className="text-sm text-foreground-muted mt-2">
                  Currently: <span className="font-medium text-foreground">
                    English
                  </span>
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  More languages coming soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed save button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {hasChanges && (
          <span className="text-xs text-foreground-muted bg-surface border
                           border-border-subtle rounded-xl px-3 py-2 shadow-sm
                           animate-[fadeIn_0.2s_ease-out]">
            Unsaved changes
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`btn-primary press-effect shadow-lg
                      shadow-[var(--theme-brand-glow)] min-w-[110px] cursor-pointer
                      ${!hasChanges ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {saving ? (
            <span className="shimmer-text">Saving...</span>
          ) : savedSuccess ? (
            <span className="flex items-center gap-1.5 justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </span>
          ) : (
            "Save changes"
          )}
        </button>
      </div>

      {/* ── Delete account confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4
                     bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setDeleteConfirmText("");
            }
          }}
        >
          <div className="bg-surface border border-red-500/20 rounded-3xl p-8
                          w-full max-w-md shadow-2xl
                          animate-[fadeInScale_0.25s_ease-out]">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-foreground-muted mb-5 leading-relaxed">
              This will permanently delete your account, all your posts,
              and all your comments. This cannot be undone.
            </p>

            <label className="block text-[11px] font-bold uppercase
                              tracking-widest text-foreground-muted mb-2
                              font-display">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="input-base mb-5"
              autoFocus
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="btn-ghost flex-1 press-effect cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => {
                  // Real API call integration point:
                  // await usersClient.delete("/users/me")
                  showToast("Account deletion coming soon.", "info");
                  setShowDeleteModal(false);
                }}
                className={`flex-1 inline-flex items-center justify-center
                            gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                            transition-all press-effect
                            ${deleteConfirmText === "DELETE"
                              ? "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                              : "bg-red-500/20 text-red-500/40 cursor-not-allowed"
                            }`}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
