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
    created_at?: string;
};

type Comment = {
    id: number;
    content: string;
    post_id: number;
    post_title: string;
    owner_id: number;
    created_at?: string;
};

type UserProfile = {
    id: number;
    username: string;
    created_at: string;
    profile_meta?: any;
    posts: Post[];
    comments: Comment[];
};

function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
}

function getIntensityStyle(intensity: 0 | 1 | 2 | 3 | 4): React.CSSProperties {
    const opacities = [0, 0.15, 0.35, 0.6, 1];
    if (intensity === 0) {
        return {
            backgroundColor: "var(--theme-border-subtle)",
        };
    }
    return {
        backgroundColor: "var(--theme-brand)",
        opacity: opacities[intensity],
    };
}

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

    const [hoveredDay, setHoveredDay] = useState<{
        date: string;
        count: number;
        label: string;
        x: number;
        y: number;
    } | null>(null);

    const activityData = useMemo(() => {
        const countMap: Record<string, number> = {};

        (profileData?.posts || []).forEach(post => {
            if (!post.created_at) return;
            const date = new Date(post.created_at)
                .toISOString().split("T")[0];
            countMap[date] = (countMap[date] || 0) + 1;
        });

        (profileData?.comments || []).forEach(comment => {
            if (!comment.created_at) return;
            const date = new Date(comment.created_at)
                .toISOString().split("T")[0];
            countMap[date] = (countMap[date] || 0) + 1;
        });

        const days: { date: string; count: number; label: string }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 111; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().split("T")[0];
            days.push({
                date: key,
                count: countMap[key] || 0,
                label: d.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                }),
            });
        }

        const total = Object.values(countMap).reduce((s, n) => s + n, 0);
        const activeDays = Object.values(countMap).filter(n => n > 0).length;

        // ── Current streak (consecutive days up to today with activity)
        let currentStreak = 0;
        const todayStr = new Date().toISOString().split("T")[0];
        for (let i = days.length - 1; i >= 0; i--) {
            if (days[i].count > 0) {
                currentStreak++;
            } else {
                // Allow today to be empty (day not over yet)
                if (days[i].date === todayStr) continue;
                break;
            }
        }

        // ── Longest streak ever in the 16-week window
        let longestStreak = 0;
        let tempStreak = 0;
        for (const day of days) {
            if (day.count > 0) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }

        // ── Most active day of week (0=Sun, 1=Mon ... 6=Sat)
        const dayOfWeekCounts: number[] = Array(7).fill(0);
        for (const day of days) {
            if (day.count > 0) {
                const dow = new Date(day.date).getDay();
                dayOfWeekCounts[dow] += day.count;
            }
        }
        const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const bestDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
        const bestDay = total > 0 ? DAY_NAMES[bestDayIndex] : null;

        // ── Top category (from profileData.posts)
        const catCounts: Record<string, number> = {};
        (profileData?.posts || []).forEach(p => {
            if (!p.category) return;
            catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        });
        const topCategory = Object.keys(catCounts).length > 0
            ? Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]
            : null;

        // ── Most active week (highest total in any 7-day window)
        let peakWeekCount = 0;
        for (let w = 0; w < 16; w++) {
            const weekDays = days.slice(w * 7, w * 7 + 7);
            const weekTotal = weekDays.reduce((s, d) => s + d.count, 0);
            peakWeekCount = Math.max(peakWeekCount, weekTotal);
        }

        return {
            days,
            total,
            activeDays,
            currentStreak,
            longestStreak,
            bestDay,
            topCategory,
            peakWeekCount,
        };
    }, [profileData]);

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

                    <h1 className="text-3xl font-extrabold text-foreground flex items-center flex-wrap">
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
                        {activityData.currentStreak >= 3 && (
                            <div className="inline-flex items-center gap-1 badge-pop
                                            bg-orange-500/10 text-orange-500 text-xs
                                            font-bold px-2.5 py-1 rounded-full
                                            border border-orange-500/20 ml-3 align-middle mb-1">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"
                                     stroke="none">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3
                                             -1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5
                                             2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294
                                             1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                </svg>
                                {activityData.currentStreak} day streak
                            </div>
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

            {/* Heatmap Section */}
            {profileData && (isCurrentUser || (profileMeta.privacy?.showActivity ?? true)) && (
                <div className="bg-surface rounded-2xl border border-border-subtle
                                p-6 shadow-sm relative overflow-hidden animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-display text-base font-bold text-foreground
                                       flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-brand inline-block" />
                            Activity
                        </h2>
                        {activityData.total > 0 && (
                            <span className="text-xs text-foreground-muted">
                                Last 16 weeks
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-6 items-center w-full">
                        <div className="w-full overflow-x-auto scrollbar-hide pb-2">
                            <div className="w-max mx-auto flex flex-col justify-center">
                        {(() => {
                            const weeks = [];
                            for (let w = 0; w < 16; w++) {
                                weeks.push(activityData.days[w * 7]);
                            }
                            const monthLabels: { label: string; weekIndex: number }[] = [];
                            let lastMonth = "";
                            weeks.forEach((day, i) => {
                                if (!day) return;
                                const month = new Date(day.date).toLocaleDateString("en-US", {
                                    month: "short",
                                });
                                if (month !== lastMonth) {
                                    monthLabels.push({ label: month, weekIndex: i });
                                    lastMonth = month;
                                }
                            });

                            return (
                                <div className="flex mb-2 pl-[32px]" style={{ gap: "4px" }}>
                                    {Array.from({ length: 16 }).map((_, weekIdx) => {
                                        const label = monthLabels.find(m => m.weekIndex === weekIdx);
                                        return (
                                            <div
                                                key={weekIdx}
                                                className="text-[10px] text-foreground-muted font-medium"
                                                style={{ width: 14, flexShrink: 0 }}
                                            >
                                                {label ? label.label : ""}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        <div className="flex items-start gap-3">
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateRows: "repeat(7, 14px)",
                                    gap: "4px",
                                    paddingTop: 0,
                                }}
                            >
                                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
                                    <div
                                        key={d}
                                        className="text-[10px] text-foreground-muted flex items-center pr-2 font-medium"
                                        style={{ height: 14, visibility: i % 2 === 0 ? "hidden" : "visible" }}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>

                            <div
                                className="relative"
                                onMouseLeave={() => setHoveredDay(null)}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(16, 14px)",
                                        gridTemplateRows: "repeat(7, 14px)",
                                        gap: "4px",
                                        gridAutoFlow: "column",
                                    }}
                                >
                                    {activityData.days.map((day) => {
                                        const intensity = getIntensity(day.count);
                                        return (
                                            <div
                                                key={day.date}
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 3,
                                                    cursor: day.count > 0 ? "pointer" : "default",
                                                    transition: "transform 0.1s ease, opacity 0.1s ease",
                                                    ...getIntensityStyle(intensity),
                                                }}
                                                onMouseEnter={e => {
                                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                                    const containerRect = (e.target as HTMLElement)
                                                        .closest(".relative")!
                                                        .getBoundingClientRect();
                                                    setHoveredDay({
                                                        ...day,
                                                        x: rect.left - containerRect.left + rect.width / 2,
                                                        y: rect.top - containerRect.top,
                                                    });
                                                    (e.target as HTMLElement).style.transform = "scale(1.3)";
                                                }}
                                                onMouseLeave={e => {
                                                    (e.target as HTMLElement).style.transform = "scale(1)";
                                                }}
                                            />
                                        );
                                    })}
                                </div>

                                {hoveredDay && (
                                    <div
                                        className="absolute z-20 pointer-events-none
                                                   bg-surface border border-border-subtle rounded-xl
                                                   px-3 py-2 shadow-xl shadow-[var(--theme-brand-glow)]
                                                   text-xs font-medium whitespace-nowrap
                                                   animate-[fadeInUp_0.15s_ease-out]"
                                        style={{
                                            left: Math.max(0, Math.min(hoveredDay.x - 60, 180)),
                                            top: hoveredDay.y - 52,
                                        }}
                                    >
                                        <span className="text-foreground font-semibold">
                                            {hoveredDay.count > 0
                                                ? `${hoveredDay.count} action${hoveredDay.count > 1 ? "s" : ""}`
                                                : "No activity"}
                                        </span>
                                        <span className="text-foreground-muted ml-1">
                                            — {hoveredDay.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 justify-end pr-2 w-full">
                            <span className="text-[10px] text-foreground-muted">Less</span>
                            {([0, 1, 2, 3, 4] as const).map(level => (
                                <div
                                    key={level}
                                    style={{
                                        width: 11,
                                        height: 11,
                                        borderRadius: 2,
                                        ...getIntensityStyle(level),
                                    }}
                                />
                            ))}
                            <span className="text-[10px] text-foreground-muted">More</span>
                        </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 w-full px-2">
                        <div className="flex items-center gap-2 bg-background border border-border-subtle rounded-full px-3.5 py-1.5 shadow-sm hover:border-brand/30 transition-colors">
                            <div className="text-orange-500 flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 -1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                </svg>
                            </div>
                            <div className="text-sm font-semibold text-foreground tracking-tight">
                                {activityData.currentStreak} <span className="text-foreground-muted font-medium text-xs ml-0.5">streak</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-background border border-border-subtle rounded-full px-3.5 py-1.5 shadow-sm hover:border-brand/30 transition-colors">
                            <div className="text-brand flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                    <path d="M4 22h16"/>
                                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                                </svg>
                            </div>
                            <div className="text-sm font-semibold text-foreground tracking-tight">
                                {activityData.longestStreak} <span className="text-foreground-muted font-medium text-xs ml-0.5">best</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-background border border-border-subtle rounded-full px-3.5 py-1.5 shadow-sm hover:border-brand/30 transition-colors">
                            <div className="text-green-500 flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <div className="text-xs font-semibold text-foreground tracking-tight max-w-[120px] truncate">
                                {activityData.bestDay ?? "—"}
                            </div>
                        </div>

                        {activityData.topCategory && (
                            <div className="flex items-center gap-2 bg-background border border-border-subtle rounded-full px-3.5 py-1.5 shadow-sm hover:border-brand/30 transition-colors">
                                <div className="text-purple-500 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="4" y1="9" x2="20" y2="9"/>
                                        <line x1="4" y1="15" x2="20" y2="15"/>
                                        <line x1="10" y1="3" x2="8" y2="21"/>
                                        <line x1="16" y1="3" x2="14" y2="21"/>
                                    </svg>
                                </div>
                                <div className="text-xs font-semibold text-foreground tracking-tight capitalize max-w-[120px] truncate">
                                    {activityData.topCategory[0]}
                                </div>
                            </div>
                        )}

                        {activityData.peakWeekCount > 0 && (
                            <div className="flex items-center gap-2 bg-background border border-border-subtle rounded-full px-3.5 py-1.5 shadow-sm hover:border-brand/30 transition-colors">
                                <div className="text-blue-500 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                                        <polyline points="16 7 22 7 22 13"/>
                                    </svg>
                                </div>
                                <div className="text-sm font-semibold text-foreground tracking-tight">
                                    {activityData.peakWeekCount} <span className="text-foreground-muted font-medium text-xs ml-0.5">best week</span>
                                </div>
                            </div>
                        )}
                    </div>
            </div>

                    {activityData.total === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center
                                        bg-surface/80 backdrop-blur-[2px] rounded-2xl z-10">
                            <p className="text-sm text-foreground-muted font-medium">
                                No activity in the last 16 weeks yet.
                            </p>
                        </div>
                    )}
                </div>
            )}

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
