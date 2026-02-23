import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserGroupIcon, CalendarIcon, UsersIcon, HomeIcon, ClipboardDocumentListIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '../hooks/useDebounce';
import { searchService } from '../services/searchService';
import UserAvatar from './UserAvatar';

const staticCommands = [
  { name: 'Go to Dashboard', icon: HomeIcon, action: '/dashboard' },
  { name: 'Go to Feed', icon: ChatBubbleBottomCenterTextIcon, action: '/posts' },
  { name: 'Go to Members', icon: UserGroupIcon, action: '/members' },
  { name: 'Go to Events', icon: CalendarIcon, action: '/events' },
  { name: 'Go to Member Requests', icon: ClipboardDocumentListIcon, action: '/member-requests' },
  { name: 'Go to Users', icon: UsersIcon, action: '/users' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const debouncedQuery = useDebounce(query, 300);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
    setQuery('');
    setResults(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchService.search(debouncedQuery).then(({ data }) => setResults(data));
    } else {
      setResults(null);
    }
  }, [debouncedQuery]);

  const handleSelect = (path, state) => {
    setOpen(false);
    if (state) {
      navigate(path, { state });
    } else {
      navigate(path);
    }
  };

  const handleMemberClick = (member) => {
    handleSelect('/members', { viewMemberId: member.id });
  };

  const handleUserClick = (user) => {
    handleSelect('/users', { viewUserId: user.id });
  };

  const filteredCommands = query
    ? staticCommands.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : staticCommands;

  const hasResults = results && (results.members?.length > 0 || results.events?.length > 0 || results.users?.length > 0 || results.posts?.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
          >
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-surface-200 dark:border-dark-border overflow-hidden">
              <div className="flex items-center px-5 border-b border-surface-200 dark:border-dark-border">
                <MagnifyingGlassIcon className="h-5 w-5 text-surface-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members, events, users or type a command..."
                  className="w-full px-4 py-4 bg-transparent text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none text-base"
                />
                <button onClick={toggle} className="shrink-0">
                  <XMarkIcon className="h-5 w-5 text-surface-400 hover:text-surface-600" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {filteredCommands.length > 0 && !hasResults && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Navigate</p>
                    {filteredCommands.map((cmd) => (
                      <button
                        key={cmd.name}
                        onClick={() => handleSelect(cmd.action)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors"
                      >
                        <cmd.icon className="h-5 w-5 text-surface-400" />
                        <span className="text-sm">{cmd.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {results && (
                  <>
                    {results.members?.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Members</p>
                        {results.members.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleMemberClick(m)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <UserAvatar
                              user={m}
                              name={m.member?.full_name || m.name}
                              photoPath={m.member?.photo_path}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {m.member?.full_name || m.name}
                                {m.member?.surname ? ` ${m.member.surname}` : ''}
                              </p>
                              <p className="text-xs text-surface-400 truncate">{m.email}</p>
                            </div>
                            {m.member?.area && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 dark:bg-dark-hover text-surface-500 dark:text-surface-400 whitespace-nowrap hidden sm:inline-block">{m.member.area.name}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {results.events?.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Events</p>
                        {results.events.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => handleSelect(`/events`)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                              <CalendarIcon className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{e.title}</p>
                              <p className="text-xs text-surface-400 truncate">{e.location}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.users?.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Users</p>
                        {results.users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleUserClick(u)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-white">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{u.name}</p>
                              <p className="text-xs text-surface-400 truncate">{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.posts?.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Posts</p>
                        {results.posts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelect('/posts')}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                              <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{p.body?.substring(0, 80)}{p.body?.length > 80 ? '...' : ''}</p>
                              <p className="text-xs text-surface-400">by {p.user?.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {query && debouncedQuery.length >= 2 && results && !hasResults && filteredCommands.length === 0 && (
                  <p className="text-center py-10 text-surface-400">No results found</p>
                )}
              </div>

              <div className="px-5 py-2.5 border-t border-surface-200 dark:border-dark-border flex items-center justify-between">
                <p className="text-xs text-surface-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-dark-hover font-mono text-xs">Ctrl</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-dark-hover font-mono text-xs">K</kbd>
                  {' to toggle'}
                </p>
                <p className="text-xs text-surface-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-dark-hover font-mono text-xs">Esc</kbd>
                  {' to close'}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
