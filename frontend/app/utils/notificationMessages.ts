import type { Notification, AdminNotification } from "../types/notifications";

export function buildNotificationMessage(n: Omit<Notification, 'message'>): string {
  switch (n.type) {
    case "comment_on_your_post":
      return `${n.actorUsername} commented on your post "${n.postTitle}"`;
    case "reply_to_your_comment":
      return `${n.actorUsername} replied to your comment`;
    case "mention":
      return `${n.actorUsername} mentioned you in a comment`;
    case "like_on_your_post":
      return `${n.actorUsername} liked your post "${n.postTitle}"`;
    case "like_on_your_comment":
      return `${n.actorUsername} liked your comment`;
    case "comment_pinned":
      return `Your comment was pinned by ${n.actorUsername}`;
    case "post_removed_by_admin":
      return `Your post "${n.postTitle}" was removed by a moderator`;
    case "comment_removed_by_admin":
      return `Your comment was removed by a moderator`;
    case "account_banned":
      return `Your account has been suspended`;
    case "account_unbanned":
      return `Your account suspension has been lifted`;
    default:
      return "You have a new notification";
  }
}

export function buildAdminNotificationMessage(n: Omit<AdminNotification, 'message'>): string {
    switch (n.type) {
        case "new_report":
            return `${n.actorUsername || "A user"} submitted a new report`;
        case "new_user_registered":
            return `${n.actorUsername} joined the forum`;
        case "flagged_content":
            return `Content flagged by automated moderation`;
        case "user_banned":
            return `${n.actorUsername} was banned`;
        default:
            return "New admin alert";
    }
}
