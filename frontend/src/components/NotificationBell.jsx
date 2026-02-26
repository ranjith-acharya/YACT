import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon } from '@heroicons/react/24/outline';
import { notificationService } from '../services/notificationService';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationService.getUnreadCount();
      setUnreadCount(data.count);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationService.getAll({ per_page: 10 });
      setNotifications(data.data || []);
    } catch {}
  }, []);

  // Poll only when tab is visible; refetch when user returns to tab. Avoids constant hits in background.
  const POLL_INTERVAL_MS = 60_000; // 1 min when visible (was 15s always)

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };

    tick(); // initial fetch
    const interval = setInterval(tick, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchUnread(); // refetch as soon as user comes back
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchUnread]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (notif) => {
    if (!notif.read_at) {
      await notificationService.markAsRead(notif.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
      >
        <BellIcon className="h-5 w-5 text-surface-600 dark:text-surface-400" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-surface-200 dark:border-dark-border overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-dark-border">
              <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors border-b border-surface-100 dark:border-dark-border last:border-0 ${
                      !n.read_at ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <p className="text-sm text-surface-800 dark:text-surface-200">{n.message}</p>
                    <p className="text-xs text-surface-400 mt-1">{timeAgo(n.created_at)}</p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-surface-400">No notifications yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
