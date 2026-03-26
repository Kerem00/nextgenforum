export type NotificationType =
  | "comment_on_your_post"      // someone commented on a post you own
  | "reply_to_your_comment"     // someone replied to your comment (quoted you via blockquote)
  | "mention"                   // someone @mentioned you in a comment
  | "like_on_your_post"         // someone liked your post
  | "like_on_your_comment"      // someone liked your comment
  | "comment_pinned"            // the post owner pinned your comment
  | "post_removed_by_admin"     // admin deleted your post
  | "comment_removed_by_admin"  // admin deleted your comment
  | "account_banned"            // your account was banned
  | "account_unbanned";         // your account was unbanned

export type Notification = {
  id: string;                    // uuid v4 generated client-side
  type: NotificationType;
  read: boolean;
  createdAt: string;             // ISO timestamp
  actorUsername?: string;        // who triggered it (e.g. who liked, who commented)
  actorId?: number;
  postId?: number;
  postTitle?: string;
  commentId?: number;
  commentPreview?: string;       // first 80 chars of the comment content
  message: string;               // pre-rendered human-readable message string
};

export type AdminNotificationType =
  | "new_report"           // a user submitted a report (post or comment)
  | "new_user_registered"  // a new user joined the forum
  | "flagged_content"      // LLM moderation flagged a post or comment
  | "user_banned";         // admin performed a ban (audit log entry)

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  read: boolean;
  createdAt: string;
  actorUsername?: string;
  actorId?: number;
  targetId?: number; // E.g., reported post/comment ID or banned user ID
  message: string;
};
