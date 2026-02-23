import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: null },
  { name: 'Feed', href: '/posts', icon: ChatBubbleBottomCenterTextIcon, roles: null },
  { name: 'Members', href: '/members', icon: UserGroupIcon, roles: null },
  { name: 'Events', href: '/events', icon: CalendarIcon, roles: null },
  { name: 'Member Requests', href: '/member-requests', icon: ClipboardDocumentListIcon, roles: ['Sub-Manager', 'Manager', 'Admin', 'Super Admin'] },
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['Admin', 'Super Admin'] },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, roles: ['Admin', 'Super Admin'] },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon, roles: null },
];

export default function Sidebar({ mobile, onClose }) {
  const { hasAnyRole } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.roles || hasAnyRole(...item.roles)
  );

  return (
    <aside
      className={`${
        mobile ? 'fixed inset-y-0 left-0 z-40 w-64' : 'hidden lg:flex lg:w-64 lg:flex-col'
      } bg-white dark:bg-dark-surface border-r border-surface-200 dark:border-dark-border`}
    >
      <div className="flex h-16 items-center gap-2 px-6 border-b border-surface-200 dark:border-dark-border">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-semibold text-surface-900 dark:text-surface-100 text-lg">Alakkal</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-dark-hover'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-6 bg-primary-600 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
