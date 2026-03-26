// Temporary definition until User type is globally extracted, matches AuthContext
type User = {
    id: number;
    username: string;
    email: string;
    role?: string;
};

export function isAdmin(user: User | null | undefined): boolean {
    if (!user) return false;
    return user.role === "admin";
}
