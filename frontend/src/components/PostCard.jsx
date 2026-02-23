import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon as HeartOutline,
  ChatBubbleLeftIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import toast from 'react-hot-toast';

const PREVIEW_COUNT = 3;

function CommentItem({ comment, postId, canDelete, onDelete, timeAgo }) {
  const [liked, setLiked] = useState(!!comment.is_liked);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [animating, setAnimating] = useState(false);

  const handleLike = async () => {
    setAnimating(true);
    try {
      const { data } = await postService.toggleCommentLike(postId, comment.id);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch {
      toast.error('Failed to like comment');
    } finally {
      setTimeout(() => setAnimating(false), 300);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex gap-2.5 group"
    >
      <UserAvatar user={comment.user} size="sm" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="bg-surface-50 dark:bg-dark-bg rounded-2xl px-3.5 py-2 inline-block max-w-full">
          <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 leading-tight">{comment.user?.name}</p>
          <p className="text-[13px] text-surface-700 dark:text-surface-300 mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[11px] text-surface-400">{timeAgo(comment.created_at)}</span>
          <button
            onClick={handleLike}
            className={`text-[11px] font-semibold transition-colors ${
              liked ? 'text-red-500' : 'text-surface-400 hover:text-red-400'
            }`}
          >
            <span className="flex items-center gap-0.5">
              {liked ? (
                <HeartSolid className={`h-3 w-3 ${animating ? 'animate-bounce' : ''}`} />
              ) : (
                <HeartOutline className="h-3 w-3" />
              )}
              {likesCount > 0 && <span>{likesCount}</span>}
              {!likesCount && 'Like'}
            </span>
          </button>
          {canDelete && (
            <button onClick={() => onDelete(comment.id)} className="text-[11px] text-surface-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user, hasAnyRole } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const canDelete = post.user_id === user?.id || hasAnyRole('Admin', 'Super Admin');
  const totalComments = Math.max(post.comments_count || 0, comments.length);
  const visibleComments = expanded ? comments : comments.slice(0, PREVIEW_COUNT);
  const hasMore = totalComments > PREVIEW_COUNT && !expanded;

  const handleLike = async () => {
    try {
      const { data } = await postService.toggleLike(post.id);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch {
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await postService.addComment(post.id, commentText);
      setComments((prev) => [data.comment, ...prev]);
      setCommentText('');
      if (onUpdate) onUpdate(post.id, { comments_count: totalComments + 1 });
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = useCallback(async (commentId) => {
    try {
      await postService.deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onUpdate) onUpdate(post.id, { comments_count: Math.max(0, totalComments - 1) });
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  }, [post.id, totalComments, onUpdate]);

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postService.delete(post.id);
      if (onDelete) onDelete(post.id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    const d = Math.floor(s / 86400);
    if (d < 7) return `${d}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border overflow-hidden"
    >
      {/* Author header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={post.user} size="lg" className="shadow-sm" />
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-100 text-sm">{post.user?.name}</p>
            <p className="text-xs text-surface-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-hover text-surface-400 hover:text-red-500 transition-colors">
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-3">
        <p className="text-surface-800 dark:text-surface-200 whitespace-pre-wrap">{post.body}</p>
      </div>

      {/* Image */}
      {post.image_path && (
        <div className="px-5 pb-3">
          <img
            src={`/storage/${post.image_path}`}
            alt=""
            className="rounded-lg w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Like & comment counts */}
      {(likesCount > 0 || totalComments > 0) && (
        <div className="px-5 pb-2 flex items-center justify-between text-xs text-surface-400">
          <span className="flex items-center gap-1">
            {likesCount > 0 && (
              <>
                <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-red-500 -mr-0.5">
                  <HeartSolid className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="ml-1">{likesCount}</span>
              </>
            )}
          </span>
          {totalComments > 0 && (
            <button onClick={() => setExpanded(true)} className="hover:underline">
              {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-surface-100 dark:border-dark-border">
        <button
          onClick={handleLike}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
        >
          {liked ? (
            <HeartSolid className="h-5 w-5 text-red-500" />
          ) : (
            <HeartOutline className="h-5 w-5 text-surface-400" />
          )}
          <span className={liked ? 'text-red-500' : 'text-surface-500'}>Like</span>
        </button>
        <button
          onClick={() => setShowInput((s) => !s)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-surface-500 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
        >
          <ChatBubbleLeftIcon className="h-5 w-5 text-surface-400" />
          Comment
        </button>
      </div>

      {/* Comments section — always visible if there are comments */}
      {(comments.length > 0 || showInput) && (
        <div className="border-t border-surface-100 dark:border-dark-border">
          {/* Recent comments preview */}
          {visibleComments.length > 0 && (
            <div className="px-4 pt-3 pb-1 space-y-3">
              {hasMore && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs font-semibold text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors pl-1"
                >
                  View all {totalComments} comments
                </button>
              )}
              <AnimatePresence initial={false}>
                {visibleComments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    canDelete={c.user_id === user?.id || hasAnyRole('Admin', 'Super Admin')}
                    onDelete={handleDeleteComment}
                    timeAgo={timeAgo}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Comment input */}
          <AnimatePresence>
            {showInput && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleComment}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <UserAvatar user={user} size="sm" />
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-full border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-bg text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                    className="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
