import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon, UserGroupIcon, CalendarIcon, ClipboardDocumentListIcon, ChevronRightIcon, XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import { dashboardService } from '../services/dashboardService';
import { memberService } from '../services/memberService';
import { SkeletonCard } from '../components/SkeletonLoader';
import StatusBadge from '../components/StatusBadge';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function getRelationPrefix(member, parentMember) {
  const name = (member?.full_name || '').toLowerCase().trim();
  if (parentMember?.family_members?.length) {
    for (const fm of parentMember.family_members) {
      if (fm.name && fm.name.toLowerCase().trim() === name) {
        if (fm.relation === 'Daughter') return 'D/O';
        if (fm.relation === 'Son') return 'S/O';
      }
    }
  }
  const family = member?.family_members || [];
  for (const fm of family) {
    if (fm.relation === 'Wife') return 'S/O';
    if (fm.relation === 'Husband') return 'D/O';
  }
  return 'C/O';
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMember, setViewMember] = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const { user, hasAnyRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    dashboardService.getStats()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  const openMember = async (userId) => {
    try {
      const { data } = await memberService.getById(userId);
      setViewMember(data.user);
    } catch { /* ignore */ }
  };

  const handleNavigate = (userId) => {
    if (viewMember) setNavHistory((prev) => [...prev, viewMember]);
    openMember(userId);
  };

  const handleBack = () => {
    const prev = navHistory[navHistory.length - 1];
    setNavHistory((h) => h.slice(0, -1));
    setViewMember(prev);
  };

  const closeModal = () => {
    setViewMember(null);
    setNavHistory([]);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: data?.stats?.total_users, icon: UsersIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', href: '/users', roles: ['Admin', 'Super Admin'] },
    { label: 'Active Members', value: data?.stats?.active_members, icon: UserGroupIcon, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', href: '/members', roles: null },
    { label: 'Pending Requests', value: data?.stats?.pending_requests, icon: ClipboardDocumentListIcon, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400', href: '/member-requests', roles: ['Sub-Manager', 'Manager', 'Admin', 'Super Admin'] },
    { label: 'Upcoming Events', value: data?.stats?.upcoming_events, icon: CalendarIcon, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', href: '/events', roles: null },
  ].filter((s) => !s.roles || hasAnyRole(...s.roles));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Dashboard</h1>
        <p className="text-surface-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}
            onClick={() => navigate(stat.href)}
            className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-surface-200 dark:border-dark-border cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500">{stat.label}</p>
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-100 mt-1">{stat.value ?? 0}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} initial="hidden" animate="show" className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border">
          <div className="px-6 py-4 border-b border-surface-200 dark:border-dark-border">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100">Recent Members</h2>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-dark-border">
            {data?.recent_members?.length > 0 ? data.recent_members.map((m) => {
              const prefix = getRelationPrefix(m.member, m.member?.parent_member);
              return (
                <div key={m.id}
                  onClick={() => openMember(m.id)}
                  className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={m} name={m.member?.full_name || m.name} photoPath={m.member?.photo_path} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{m.member?.full_name || m.name}{m.member?.surname ? ` ${m.member.surname}` : ''}</p>
                      <p className="text-xs text-surface-500 truncate">
                        {m.member?.father_name && <span>{prefix} {m.member.father_name}</span>}
                        {m.member?.father_name && m.member?.area && <span className="mx-1">•</span>}
                        {m.member?.area && <span>{m.member.area.name}</span>}
                        {!m.member?.father_name && !m.member?.area && <span>{m.member?.email || m.email}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={m.status} />
                    <ChevronRightIcon className="h-4 w-4 text-surface-300 dark:text-surface-600 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              );
            }) : (
              <p className="px-6 py-8 text-center text-surface-400">No members yet</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border">
          <div className="px-6 py-4 border-b border-surface-200 dark:border-dark-border">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100">Upcoming Events</h2>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-dark-border">
            {data?.upcoming_events?.length > 0 ? data.upcoming_events.map((e) => (
              <div key={e.id}
                onClick={() => navigate('/events')}
                className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors group">
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{e.title}</p>
                  <p className="text-xs text-surface-500">{e.location} &middot; {new Date(e.event_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={e.status} />
                  <ChevronRightIcon className="h-4 w-4 text-surface-300 dark:text-surface-600 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            )) : (
              <p className="px-6 py-8 text-center text-surface-400">No upcoming events</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Member Detail Modal */}
      <AnimatePresence>
        {viewMember && (
          <MemberDetailModal
            user={viewMember}
            onClose={closeModal}
            onNavigate={handleNavigate}
            onBack={navHistory.length > 0 ? handleBack : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberDetailModal({ user: memberUser, onClose, onNavigate, onBack }) {
  const m = memberUser.member || {};
  const family = m.family_members || [];
  const photoUrl = m.photo_path ? `/storage/${m.photo_path}` : null;
  const linkedMembers = m.linked_members || [];
  const parentMember = m.parent_member || null;

  const getRelationToParent = () => {
    if (!parentMember) return null;
    const parentName = (parentMember.full_name || '').toLowerCase().trim();
    for (const fm of family) {
      if (fm.name && fm.name.toLowerCase().trim() === parentName) return fm.relation;
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
      onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-surface-200 dark:border-dark-border w-full max-w-7xl max-h-[90vh] overflow-y-auto mx-4">

        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="text-white/70 hover:text-white transition-colors" title="Go back">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">Member Details</h2>
              <p className="text-primary-200 text-sm">Joined {new Date(memberUser.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={memberUser.status} />
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Photo + Basic Info */}
          <div className="flex items-start gap-6">
            {photoUrl ? (
              <img src={photoUrl} alt="Member" className="w-24 h-28 rounded-lg object-cover border border-surface-200 dark:border-dark-border flex-shrink-0" />
            ) : (
              <div className="w-24 h-28 rounded-lg bg-surface-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-surface-300 dark:text-surface-600">
                  {(m.full_name || memberUser.name)?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">{m.full_name || memberUser.name}{m.surname ? ` ${m.surname}` : ''}</h3>
              {m.father_name && <p className="text-sm text-surface-500">{getRelationPrefix(m, parentMember)} {m.father_name}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600 dark:text-surface-400 pt-1">
                {(m.phone || memberUser.phone) && <span>Ph: {m.phone || memberUser.phone}</span>}
                {(m.email || memberUser.email) && <span>Email: {m.email || memberUser.email}</span>}
              </div>
              {memberUser.roles?.length > 0 && (
                <div className="flex gap-1.5 pt-1">
                  {memberUser.roles.map((r) => (
                    <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium">
                      {r.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail Grid */}
          {(m.old_membership_no || m.new_membership_no || m.residence || m.area || m.native_place) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Old Membership No" value={m.old_membership_no} />
              <DetailField label="New Membership No" value={m.new_membership_no} />
              <DetailField label="Residence" value={m.residence} full />
              {m.area && <DetailField label="Area" value={`${m.area.name}, ${m.area.region}`} />}
              <DetailField label="Native Place" value={m.native_place} full />
            </div>
          )}

          {/* Family Members */}
          {family.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Family Members ({family.length})</h4>
              <div className="border border-surface-200 dark:border-dark-border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-surface-50 dark:bg-dark-hover text-surface-500">
                      <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[160px]">Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[100px]">Relation</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[90px]">Age / DOB</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[120px]">Occupation</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[120px]">Qualification</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[100px]">Marital Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[120px]">Contact</th>
                      <th className="px-3 py-2.5 text-left font-semibold min-w-[200px]">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
                    {family.map((fm, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-surface-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-surface-900 dark:text-surface-100">{fm.name}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.relation}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">
                          {fm.age}{fm.dob && <span className="block text-[10px] text-surface-400">{new Date(fm.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        </td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.occupation}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.qualification}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.marital_status}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.contact_number}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Parent Profile */}
          {parentMember && (
            <div>
              <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary-500" /> Parent Profile
                {getRelationToParent() && <span className="text-xs font-normal text-surface-400">({getRelationToParent()})</span>}
              </h4>
              <div
                onClick={() => parentMember.user_id && onNavigate(parentMember.user_id)}
                className="flex items-center gap-4 p-3 bg-surface-50 dark:bg-dark-hover rounded-lg border border-surface-200 dark:border-dark-border cursor-pointer hover:bg-surface-100 dark:hover:bg-dark-border transition-colors">
                <UserAvatar user={{ member: parentMember }} name={parentMember.full_name} photoPath={parentMember.photo_path} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{parentMember.full_name}{parentMember.surname ? ` ${parentMember.surname}` : ''}</p>
                    {getRelationToParent() && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium whitespace-nowrap">{getRelationToParent()}</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400">{parentMember.email || parentMember.phone || ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Linked Children */}
          {linkedMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-emerald-500" /> Linked Members ({linkedMembers.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedMembers.map((child) => {
                  const childRelation = (() => {
                    const childName = (child.full_name || '').toLowerCase().trim();
                    for (const fm of family) {
                      if (fm.name && fm.name.toLowerCase().trim() === childName) return fm.relation;
                    }
                    return null;
                  })();
                  return (
                    <div key={child.id}
                      onClick={() => child.user_id && onNavigate(child.user_id)}
                      className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-dark-hover rounded-lg border border-surface-200 dark:border-dark-border cursor-pointer hover:bg-surface-100 dark:hover:bg-dark-border transition-colors">
                      <UserAvatar user={{ member: child }} name={child.full_name} photoPath={child.photo_path} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900 dark:text-surface-100 text-sm truncate">{child.full_name}{child.surname ? ` ${child.surname}` : ''}</p>
                          {childRelation && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium whitespace-nowrap">{childRelation}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Close */}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-200 dark:border-dark-border">
            <button onClick={onClose}
              className="px-5 py-2 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors text-sm">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailField({ label, value, full }) {
  if (!value) return null;
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-surface-900 dark:text-surface-100 mt-0.5 break-words whitespace-pre-wrap">{value}</p>
    </div>
  );
}
