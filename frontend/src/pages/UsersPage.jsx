import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, XMarkIcon, PencilSquareIcon, TrashIcon, PlusIcon, LinkIcon } from '@heroicons/react/24/outline';
import { userService } from '../services/userService';
import { memberService } from '../services/memberService';
import { areaService } from '../services/areaService';
import StatusBadge from '../components/StatusBadge';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../services/api';
import UserAvatar from '../components/UserAvatar';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewUser, setViewUser] = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [areas, setAreas] = useState([]);
  const [groupedAreas, setGroupedAreas] = useState({});
  const { hasAnyRole, user: authUser } = useAuth();
  const debouncedSearch = useDebounce(search);
  const location = useLocation();
  const canManage = hasAnyRole('Manager', 'Admin', 'Super Admin');

  useEffect(() => {
    api.get('/roles').then(({ data }) => setRoles(data.roles || []));
    areaService.getAll().then(({ data }) => {
      setAreas(data.areas || []);
      setGroupedAreas(data.grouped || {});
    });
  }, []);

  useEffect(() => {
    if (location.state?.viewUserId) {
      userService.getById(location.state.viewUserId)
        .then(({ data }) => setViewUser(data.user))
        .catch(() => {});
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    userService.getAll(params)
      .then(({ data }) => setUsers(data.data || []))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handleStatusChange = async (id, status) => {
    try {
      await userService.updateStatus(id, status);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
      toast.success('Status updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      const { data } = await userService.assignRole(id, role);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, roles: data.user.roles } : u));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Users</h1>
        <p className="text-surface-500 mt-1">Manage user accounts and roles</p>
      </div>

      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-surface text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
      </div>

      {loading ? <SkeletonTable /> : (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 dark:bg-dark-hover">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
                {users.map((u) => {
                  const isSuperAdmin = u.roles?.some((r) => r.name === 'Super Admin');
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-surface-50 dark:hover:bg-dark-hover">
                      <td className="px-6 py-4">
                        <p className="font-medium text-surface-900 dark:text-surface-100">{u.name}</p>
                        <p className="text-xs text-surface-400">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isSuperAdmin ? (
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Super Admin</span>
                        ) : (
                          <select value={u.roles?.[0]?.name || ''} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="text-sm px-2 py-1 rounded border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-700 dark:text-surface-300 outline-none">
                            {roles.filter((r) => r.name !== 'Super Admin').map((r) => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => setViewUser(u)}
                          className="text-xs px-3 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 font-medium transition-colors inline-flex items-center">
                          <EyeIcon className="h-3.5 w-3.5 mr-1" />View
                        </button>
                        {!isSuperAdmin && (
                          <select value={u.status} onChange={(e) => handleStatusChange(u.id, e.target.value)}
                            className="text-sm px-2 py-1 rounded border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-700 dark:text-surface-300 outline-none">
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                            <option value="archived">Archived</option>
                          </select>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-surface-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ===== USER DETAIL MODAL ===== */}
      <AnimatePresence>
        {viewUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-surface-200 dark:border-dark-border w-full max-w-7xl max-h-[90vh] overflow-y-auto"
            >
              <UserDetailContent
                user={viewUser} canManage={canManage}
                areas={areas} groupedAreas={groupedAreas}
                onClose={() => { setViewUser(null); setNavHistory([]); }}
                onUpdate={(updated) => { setViewUser(updated); setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u)); }}
                onNavigate={(userId) => { setNavHistory((prev) => [...prev, viewUser]); userService.getById(userId).then(({ data }) => setViewUser(data.user)); }}
                onBack={navHistory.length > 0 ? () => { const prev = navHistory[navHistory.length - 1]; setNavHistory((h) => h.slice(0, -1)); setViewUser(prev); } : null}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const emptyFamilyRowUser = () => ({ name: '', relation: '', dob: '', age: '', occupation: '', qualification: '', marital_status: '', contact_number: '', email: '', _isNew: true });

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

function UserDetailContent({ user, canManage, onClose, onUpdate, onNavigate, onBack, areas = [], groupedAreas = {} }) {
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editPhoto, setEditPhoto] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const debouncedLinkSearch = useDebounce(linkSearch, 400);
  const m = user.member || {};
  const family = m.family_members || [];
  const photoUrl = m.photo_path ? `/storage/${m.photo_path}` : null;
  const linkedMembers = m.linked_members || [];
  const parentMember = m.parent_member || null;

  useEffect(() => {
    if (!debouncedLinkSearch || debouncedLinkSearch.length < 2) { setLinkResults([]); return; }
    setLinkLoading(true);
    memberService.getAll({ search: debouncedLinkSearch, per_page: 10 })
      .then(({ data }) => {
        setLinkResults((data.data || []).filter((u) => u.id !== user.id));
      })
      .finally(() => setLinkLoading(false));
  }, [debouncedLinkSearch, user.id]);

  const handleLink = async (parentMemberId) => {
    try {
      const { data } = await memberService.linkParent(user.id, parentMemberId);
      Swal.fire({ icon: 'success', title: 'Linked!', text: 'Parent profile linked successfully.', timer: 1500, showConfirmButton: false });
      setShowLinkSearch(false);
      setLinkSearch('');
      setLinkResults([]);
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Link failed', text: err.response?.data?.message || 'Could not link parent.', confirmButtonColor: '#5c7cfa' });
    }
  };

  const handleUnlink = async () => {
    const result = await Swal.fire({ title: 'Unlink parent?', text: 'This will remove the parent link.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, unlink' });
    if (!result.isConfirmed) return;
    try {
      const { data } = await memberService.unlinkParent(user.id);
      Swal.fire({ icon: 'success', title: 'Unlinked', timer: 1500, showConfirmButton: false });
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Could not unlink.', confirmButtonColor: '#5c7cfa' });
    }
  };

  const getRelationToParent = () => {
    if (!parentMember) return null;
    const parentName = (parentMember.full_name || '').toLowerCase().trim();
    for (const fm of family) {
      if (fm.name && fm.name.toLowerCase().trim() === parentName) return fm.relation;
    }
    return null;
  };

  const displayName = m.full_name || user.name;
  const displayNameFull = m.surname ? `${displayName} ${m.surname}` : displayName;

  const startEditing = () => {
    setEditForm({
      full_name: m.full_name || user.name || '',
      surname: m.surname || '',
      father_name: m.father_name || '',
      residence: m.residence || '',
      area_id: m.area_id || '',
      native_place: m.native_place || '',
      old_membership_no: m.old_membership_no || '',
      new_membership_no: m.new_membership_no || '',
      family_members: family.length > 0 ? family.map((fm) => ({ ...fm })) : [emptyFamilyRowUser()],
    });
    setEditPhoto(null);
    setEditPhotoPreview(photoUrl);
    setEditing(true);
  };

  const cancelEditing = () => { setEditing(false); setEditPhoto(null); setEditPhotoPreview(null); };

  const handleEditChange = (field, value) => {
    const upper = ['full_name', 'surname', 'father_name', 'residence', 'native_place', 'address'].includes(field);
    setEditForm((prev) => ({ ...prev, [field]: upper ? value.toUpperCase() : value }));
  };

  const handleFamilyChange = (idx, field, value) => {
    setEditForm((prev) => {
      const fms = [...prev.family_members];
      const upperFields = ['name', 'occupation', 'qualification'];
      fms[idx] = { ...fms[idx], [field]: upperFields.includes(field) ? value.toUpperCase() : value };
      if (field === 'dob' && value) {
        const age = Math.floor((new Date() - new Date(value)) / 31557600000);
        fms[idx].age = age >= 0 ? age : '';
      }
      if (field === 'relation') {
        const rel = value.toLowerCase();
        if (['wife', 'husband', 'father-in-law', 'mother-in-law', 'son-in-law', 'daughter-in-law', 'brother-in-law', 'sister-in-law'].includes(rel)) fms[idx].marital_status = 'Married';
      }
      return { ...prev, family_members: fms };
    });
  };

  const addFamilyRow = () => setEditForm((prev) => ({ ...prev, family_members: [...prev.family_members, emptyFamilyRowUser()] }));
  const removeFamilyRow = (idx) => setEditForm((prev) => ({ ...prev, family_members: prev.family_members.filter((_, i) => i !== idx) }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!editForm.full_name?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Full name is required', confirmButtonColor: '#5c7cfa' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('full_name', editForm.full_name);
      fd.append('surname', editForm.surname || '');
      fd.append('father_name', editForm.father_name || '');
      fd.append('residence', editForm.residence || '');
      if (editForm.area_id) fd.append('area_id', editForm.area_id);
      fd.append('native_place', editForm.native_place || '');
      fd.append('old_membership_no', editForm.old_membership_no || '');
      fd.append('new_membership_no', editForm.new_membership_no || '');
      const validFamily = (editForm.family_members || []).filter((fm) => fm.name?.trim());
      validFamily.forEach((fm, i) => {
        Object.entries(fm).forEach(([key, val]) => {
          fd.append(`family_members[${i}][${key}]`, val ?? '');
        });
      });
      if (editPhoto) fd.append('photo', editPhoto);

      const { data } = await memberService.update(user.id, fd);
      Swal.fire({ icon: 'success', title: 'Updated!', text: 'Member details have been updated.', timer: 1500, showConfirmButton: false });
      setEditing(false);
      if (onUpdate) onUpdate(data.user);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Update failed', text: err.response?.data?.message || 'Could not update member.', confirmButtonColor: '#5c7cfa' });
    } finally {
      setSaving(false);
    }
  };



  return (
    <>
      <div className="bg-primary-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-white/70 hover:text-white transition-colors" title="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">User Details</h2>
            <p className="text-primary-200 text-sm">Joined {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && m.full_name && !editing && (
            <button onClick={startEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors">
              <PencilSquareIcon className="h-4 w-4" /> Edit
            </button>
          )}
          <StatusBadge status={user.status} />
          <button onClick={editing ? cancelEditing : onClose} className="text-white/70 hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {editing ? (
        <EditMemberFormUser
          form={editForm} onChange={handleEditChange}
          onFamilyChange={handleFamilyChange} addFamilyRow={addFamilyRow} removeFamilyRow={removeFamilyRow}
          photoPreview={editPhotoPreview} onPhotoChange={handlePhotoChange}
          areas={areas} groupedAreas={groupedAreas}
          email={m.email || user.email} phone={m.phone || user.phone}
          saving={saving} onSave={handleSave} onCancel={cancelEditing}
        />
      ) : (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-6">
          {photoUrl ? (
            <img src={photoUrl} alt="User" className="w-24 h-28 rounded-lg object-cover border border-surface-200 dark:border-dark-border flex-shrink-0" />
          ) : (
            <div className="w-24 h-28 rounded-lg bg-surface-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-surface-300 dark:text-surface-600">{displayName?.charAt(0) || '?'}</span>
            </div>
          )}
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">{displayNameFull}</h3>
            {m.father_name && <p className="text-sm text-surface-500">{getRelationPrefix(m, parentMember)} {m.father_name}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600 dark:text-surface-400 pt-1">
              {(m.phone || user.phone) && <span>Ph: {m.phone || user.phone}</span>}
              <span>Email: {m.email || user.email}</span>
            </div>
            {user.roles?.length > 0 && (
              <div className="flex gap-1.5 pt-1">
                {user.roles.map((r) => (
                  <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium">
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {m.plain_password && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Login Credentials (Super Admin Only)</p>
                <p className="text-sm text-surface-700 dark:text-surface-300"><strong>Email:</strong> {m.email || user.email}</p>
                <p className="text-sm text-surface-700 dark:text-surface-300 mt-0.5">
                  <strong>Password:</strong>{' '}
                  {showPassword ? (
                    <span className="font-mono bg-white dark:bg-dark-bg px-2 py-0.5 rounded text-surface-900 dark:text-surface-100">{m.plain_password}</span>
                  ) : (
                    <span className="font-mono">{'•'.repeat(m.plain_password.length)}</span>
                  )}
                </p>
              </div>
              <button onClick={() => setShowPassword(!showPassword)}
                className="ml-4 p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-amber-600 dark:text-amber-400"
                title={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}

        {m.full_name && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Old Membership No" value={m.old_membership_no} />
            <DetailField label="New Membership No" value={m.new_membership_no} />
            <DetailField label="Residence" value={m.residence} full />
            {m.area && <DetailField label="Area" value={`${m.area.name}, ${m.area.region}`} />}
            <DetailField label="Native Place" value={m.native_place} full />
          </div>
        )}

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
                        <td className="px-3 py-2 font-medium text-surface-900 dark:text-surface-100">
                          {fm.name}
                        </td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400">{fm.relation}</td>
                        <td className="px-3 py-2 text-surface-600 dark:text-surface-400" title={fm.dob ? `DOB: ${new Date(fm.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}>
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
              className="flex items-center gap-4 p-3 bg-surface-50 dark:bg-dark-hover rounded-lg border border-surface-200 dark:border-dark-border cursor-pointer hover:bg-surface-100 dark:hover:bg-dark-border transition-colors"
            >
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
              {canManage && (
                <button onClick={(e) => { e.stopPropagation(); handleUnlink(); }}
                  className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors font-medium">
                  Unlink
                </button>
              )}
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
                  <div
                    key={child.id}
                    onClick={() => child.user_id && onNavigate(child.user_id)}
                    className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-dark-hover rounded-lg border border-surface-200 dark:border-dark-border cursor-pointer hover:bg-surface-100 dark:hover:bg-dark-border transition-colors"
                  >
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

        {/* Manual Link to Parent */}
        {canManage && m.full_name && !parentMember && !editing && (
          <div>
            {!showLinkSearch ? (
              <button onClick={() => setShowLinkSearch(true)}
                className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium transition-colors">
                <LinkIcon className="h-4 w-4" /> Link to Parent Member
              </button>
            ) : (
              <div className="bg-surface-50 dark:bg-dark-hover rounded-lg border border-surface-200 dark:border-dark-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Link to Parent Member</h4>
                  <button onClick={() => { setShowLinkSearch(false); setLinkSearch(''); setLinkResults([]); }}
                    className="text-surface-400 hover:text-surface-600 transition-colors"><XMarkIcon className="h-4 w-4" /></button>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input type="text" value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder="Search member by name or email..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                {linkLoading && <p className="text-xs text-surface-400">Searching...</p>}
                {linkResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {linkResults.map((result) => (
                      <button key={result.id} onClick={() => result.member && handleLink(result.member.id)}
                        disabled={!result.member}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                        <UserAvatar user={result} name={result.member?.full_name || result.name} photoPath={result.member?.photo_path} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{result.member?.full_name || result.name}{result.member?.surname ? ` ${result.member.surname}` : ''}</p>
                          <p className="text-xs text-surface-400 truncate">{result.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {debouncedLinkSearch.length >= 2 && !linkLoading && linkResults.length === 0 && (
                  <p className="text-xs text-surface-400">No members found.</p>
                )}
              </div>
            )}
          </div>
        )}

        {!m.full_name && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This user does not have a directory profile yet. Only basic account information is available.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-surface-200 dark:border-dark-border">
          <button onClick={onClose}
            className="px-5 py-2 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors text-sm">
            Close
          </button>
        </div>
      </div>
      )}
    </>
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

const inputClsU = "w-full px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
const disabledClsU = "w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover text-surface-500 dark:text-surface-400 cursor-not-allowed outline-none";
const labelClsU = "block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1";

function EditMemberFormUser({ form, onChange, onFamilyChange, addFamilyRow, removeFamilyRow, photoPreview, onPhotoChange, email, phone, areas = [], groupedAreas = {}, saving, onSave, onCancel }) {
  const [editAreaSearch, setEditAreaSearch] = useState('');
  const [showEditAreaDd, setShowEditAreaDd] = useState(false);
  const editAreaRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (editAreaRef.current && !editAreaRef.current.contains(e.target)) setShowEditAreaDd(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getAreaNameEdit = (areaId) => {
    const area = areas.find((a) => a.id === Number(areaId));
    return area ? `${area.name}, ${area.region}` : '';
  };

  const filteredEditAreas = Object.entries(groupedAreas).reduce((acc, [region, items]) => {
    const filtered = items.filter((a) => a.name.toLowerCase().includes(editAreaSearch.toLowerCase()) || region.toLowerCase().includes(editAreaSearch.toLowerCase()));
    if (filtered.length > 0) acc[region] = filtered;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-24 h-28 rounded-lg object-cover border border-surface-200 dark:border-dark-border" />
          ) : (
            <div className="w-24 h-28 rounded-lg bg-surface-100 dark:bg-dark-hover flex items-center justify-center">
              <span className="text-3xl font-bold text-surface-300 dark:text-surface-600">{form.full_name?.charAt(0) || '?'}</span>
            </div>
          )}
          <label className="mt-2 flex items-center justify-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 cursor-pointer font-medium">
            <PencilSquareIcon className="h-3.5 w-3.5" /> Change
            <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
          </label>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClsU}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)} className={inputClsU} />
          </div>
          <div>
            <label className={labelClsU}>Surname</label>
            <input type="text" value={form.surname} onChange={(e) => onChange('surname', e.target.value)} className={inputClsU} />
          </div>
          <div>
            <label className={labelClsU}>Father&apos;s Name</label>
            <input type="text" value={form.father_name} onChange={(e) => onChange('father_name', e.target.value)} className={inputClsU} />
          </div>
          <div>
            <label className={labelClsU}>Email</label>
            <input type="text" value={email || ''} disabled className={disabledClsU} title="Email cannot be changed" />
          </div>
          <div>
            <label className={labelClsU}>Phone</label>
            <input type="text" value={phone || ''} disabled className={disabledClsU} title="Phone cannot be changed" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClsU}>Old Membership No</label>
          <input type="text" value={form.old_membership_no} onChange={(e) => onChange('old_membership_no', e.target.value)} className={inputClsU} />
        </div>
        <div>
          <label className={labelClsU}>New Membership No</label>
          <input type="text" value={form.new_membership_no} onChange={(e) => onChange('new_membership_no', e.target.value)} className={inputClsU} />
        </div>
        <div>
          <label className={labelClsU}>Residence</label>
          <textarea value={form.residence} onChange={(e) => onChange('residence', e.target.value)} rows={2} className={inputClsU} />
        </div>
        <div ref={editAreaRef} className="relative">
          <label className={labelClsU}>Area</label>
          <div onClick={() => setShowEditAreaDd(!showEditAreaDd)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border cursor-pointer flex items-center justify-between bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100">
            <span className={form.area_id ? '' : 'text-surface-400'}>{form.area_id ? getAreaNameEdit(form.area_id) : 'Select area...'}</span>
            <svg className="h-4 w-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          {showEditAreaDd && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-surface-200 dark:border-dark-border max-h-56 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-surface-200 dark:border-dark-border">
                <input autoFocus type="text" value={editAreaSearch} onChange={(e) => setEditAreaSearch(e.target.value)} placeholder="Search area..." className="w-full px-3 py-1.5 text-sm rounded-md border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="overflow-y-auto flex-1">
                {Object.entries(filteredEditAreas).length === 0 && <p className="px-3 py-4 text-sm text-surface-400 text-center">No areas found</p>}
                {Object.entries(filteredEditAreas).map(([region, items]) => (
                  <div key={region}>
                    <p className="px-3 py-1 text-[10px] font-bold text-surface-400 uppercase tracking-wider bg-surface-50 dark:bg-dark-hover sticky top-0">{region}</p>
                    {items.map((area) => (
                      <button key={area.id} type="button" onClick={() => { onChange('area_id', area.id); setShowEditAreaDd(false); setEditAreaSearch(''); }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 dark:hover:bg-dark-hover ${Number(form.area_id) === area.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-surface-700 dark:text-surface-300'}`}>{area.name}</button>
                    ))}
                  </div>
                ))}
              </div>
              {form.area_id && (
                <div className="p-2 border-t border-surface-200 dark:border-dark-border">
                  <button type="button" onClick={() => { onChange('area_id', ''); setShowEditAreaDd(false); }} className="w-full text-xs text-red-500 hover:text-red-600 font-medium py-1">Clear selection</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClsU}>Native Place</label>
          <input type="text" value={form.native_place} onChange={(e) => onChange('native_place', e.target.value)} className={inputClsU} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Family Members ({form.family_members?.length || 0})</h4>
          <button type="button" onClick={addFamilyRow} className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors">
            <PlusIcon className="h-4 w-4" /> Add Row
          </button>
        </div>
        <div className="border border-surface-200 dark:border-dark-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-surface-50 dark:bg-dark-hover text-surface-500">
                <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[140px]">Name</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[130px]">Relation</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[130px]">DOB</th>
                <th className="px-2 py-2 text-left font-semibold w-14">Age</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[110px]">Occupation</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[110px]">Qualification</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[100px]">Marital St.</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[120px]">Contact</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[180px]">Email</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
              {(form.family_members || []).map((fm, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 text-surface-400">{i + 1}</td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.name} onChange={(e) => onFamilyChange(i, 'name', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5">
                    <select value={fm.relation} onChange={(e) => onFamilyChange(i, 'relation', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'}>
                      <option value="">--</option>
                      <optgroup label="Immediate Family">
                        <option value="Wife">Wife (ഭാര്യ)</option>
                        <option value="Husband">Husband (ഭർത്താവ്)</option>
                        <option value="Son">Son (മകൻ)</option>
                        <option value="Daughter">Daughter (മകൾ)</option>
                        <option value="Father">Father (അച്ഛൻ)</option>
                        <option value="Mother">Mother (അമ്മ)</option>
                        <option value="Brother">Brother (സഹോദരൻ)</option>
                        <option value="Sister">Sister (സഹോദരി)</option>
                      </optgroup>
                      <optgroup label="Grandchildren / Grandparents">
                        <option value="Grandson">Grandson (പേരമകൻ)</option>
                        <option value="Granddaughter">Granddaughter (പേരമകൾ)</option>
                        <option value="Grandfather">Grandfather (മുത്തച്ഛൻ)</option>
                        <option value="Grandmother">Grandmother (മുത്തശ്ശി)</option>
                      </optgroup>
                      <optgroup label="Paternal Relations">
                        <option value="Valiyachan">Uncle - Father's Elder Bro (വലിയച്ഛൻ)</option>
                        <option value="Chittappan">Uncle - Father's Younger Bro (ചിറ്റപ്പൻ)</option>
                        <option value="Ammayi (Paternal)">Aunt - Father's Sister (അമ്മായി)</option>
                      </optgroup>
                      <optgroup label="Maternal Relations">
                        <option value="Ammavan">Uncle - Mother's Brother (അമ്മാവൻ)</option>
                        <option value="Valiyamma">Aunt - Mother's Elder Sister (വലിയമ്മ)</option>
                        <option value="Kunjamma">Aunt - Mother's Younger Sister (കുഞ്ഞമ്മ)</option>
                      </optgroup>
                      <optgroup label="In-Laws">
                        <option value="Father-in-law">Father-in-law (അമ്മാവൻ)</option>
                        <option value="Mother-in-law">Mother-in-law (അമ്മായിഅമ്മ)</option>
                        <option value="Son-in-law">Son-in-law (മരുമകൻ)</option>
                        <option value="Daughter-in-law">Daughter-in-law (മരുമകൾ)</option>
                        <option value="Brother-in-law">Brother-in-law (അളിയൻ)</option>
                        <option value="Sister-in-law">Sister-in-law (നാത്തൂൻ)</option>
                      </optgroup>
                      <optgroup label="Others">
                        <option value="Nephew">Nephew (അനന്തിരവൻ)</option>
                        <option value="Niece">Niece (അനന്തിരവൾ)</option>
                        <option value="Cousin">Cousin (കസിൻ)</option>
                        <option value="Other">Other (മറ്റുള്ളവർ)</option>
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input type="date" value={fm.dob || ''} onChange={(e) => onFamilyChange(i, 'dob', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClsU + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.age ?? ''} readOnly tabIndex={-1} className={disabledClsU + ' !py-1.5 !px-2 text-center'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.occupation || ''} onChange={(e) => onFamilyChange(i, 'occupation', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.qualification || ''} onChange={(e) => onFamilyChange(i, 'qualification', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5">
                    <select value={fm.marital_status || ''} onChange={(e) => onFamilyChange(i, 'marital_status', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'}>
                      <option value="">--</option>
                      {['Single','Married','Widowed','Divorced'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {fm._isNew
                      ? <input type="text" value={fm.contact_number || ''} onChange={(e) => onFamilyChange(i, 'contact_number', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'} />
                      : <input type="text" value={fm.contact_number || ''} readOnly tabIndex={-1} className={disabledClsU + ' !py-1.5 !px-2'} title="Contact cannot be changed" />}
                  </td>
                  <td className="px-2 py-1.5">
                    {fm._isNew
                      ? <input type="email" value={fm.email || ''} onChange={(e) => onFamilyChange(i, 'email', e.target.value)} className={inputClsU + ' !py-1.5 !px-2'} />
                      : <input type="email" value={fm.email || ''} readOnly tabIndex={-1} className={disabledClsU + ' !py-1.5 !px-2'} title="Email cannot be changed" />}
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeFamilyRow(i)} className="p-1 text-red-400 hover:text-red-600 transition-colors" title="Remove">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-surface-200 dark:border-dark-border">
        <button onClick={onSave} disabled={saving}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
