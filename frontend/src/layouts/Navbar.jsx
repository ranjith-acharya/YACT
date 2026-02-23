import { useNavigate } from 'react-router-dom';
import { Bars3Icon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-surface-200 dark:border-dark-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-hover"
          >
            <Bars3Icon className="h-5 w-5 text-surface-600 dark:text-surface-400" />
          </button>
          <div className="hidden sm:block">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-dark-hover text-surface-400 text-sm hover:bg-surface-200 dark:hover:bg-dark-border transition-colors"
            >
              <span>Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border font-mono text-xs">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <ThemeToggle />
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
            title="View Profile"
          >
            <UserAvatar user={user} size="md" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user?.name}</p>
              <p className="text-xs text-surface-500">{user?.roles?.[0]?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-hover text-surface-500 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
