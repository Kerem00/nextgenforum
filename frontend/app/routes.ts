import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("components/Layout.tsx", [
        index("routes/home.tsx"),
        route("login", "routes/login.tsx"),
        route("register", "routes/register.tsx"),
        route("posts/:postId", "routes/post.tsx"),
        route("users/:userId", "routes/profile.tsx"),
        route("admin", "routes/admin.tsx"),
        route("notifications", "routes/notifications.tsx"),
        route("bookmarks", "routes/bookmarks.tsx"),
        route("settings/profile", "routes/edit-profile.tsx")
    ])
] satisfies RouteConfig;

// Trigger refresh
