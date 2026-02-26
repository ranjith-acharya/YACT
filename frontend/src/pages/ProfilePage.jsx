import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilSquareIcon, CheckIcon, XMarkIcon, EyeIcon, EyeSlashIcon, CameraIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/authService';
import { areaService } from '../services/areaService';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import Swal from 'sweetalert2';

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none";
const disabledCls = "w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover text-surface-500 dark:text-surface-400 cursor-not-allowed outline-none";
const labelCls = "block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1";

const relationOptions = [
  { group: 'Immediate Family', options: [
    { value: 'Wife', label: 'Wife (ഭാര്യ)' }, { value: 'Husband', label: 'Husband (ഭർത്താവ്)' },
    { value: 'Son', label: 'Son (മകൻ)' }, { value: 'Daughter', label: 'Daughter (മകൾ)' },
    { value: 'Father', label: 'Father (അച്ഛൻ)' }, { value: 'Mother', label: 'Mother (അമ്മ)' },
    { value: 'Brother', label: 'Brother (സഹോദരൻ)' }, { value: 'Sister', label: 'Sister (സഹോദരി)' },
  ]},
  { group: 'Grandchildren / Grandparents', options: [
    { value: 'Grandson', label: 'Grandson (പേരമകൻ)' }, { value: 'Granddaughter', label: 'Granddaughter (പേരമകൾ)' },
    { value: 'Grandfather', label: 'Grandfather (മുത്തച്ഛൻ)' }, { value: 'Grandmother', label: 'Grandmother (മുത്തശ്ശി)' },
  ]},
  { group: 'Paternal Relations', options: [
    { value: 'Valiyachan', label: "Uncle - Father's Elder Bro (വലിയച്ഛൻ)" },
    { value: 'Chittappan', label: "Uncle - Father's Younger Bro (ചിറ്റപ്പൻ)" },
    { value: 'Ammayi (Paternal)', label: "Aunt - Father's Sister (അമ്മായി)" },
  ]},
  { group: 'Maternal Relations', options: [
    { value: 'Ammavan', label: "Uncle - Mother's Brother (അമ്മാവൻ)" },
    { value: 'Valiyamma', label: "Aunt - Mother's Elder Sister (വലിയമ്മ)" },
    { value: 'Kunjamma', label: "Aunt - Mother's Younger Sister (കുഞ്ഞമ്മ)" },
  ]},
  { group: 'In-Laws', options: [
    { value: 'Father-in-law', label: 'Father-in-law (അമ്മാവൻ)' }, { value: 'Mother-in-law', label: 'Mother-in-law (അമ്മായിഅമ്മ)' },
    { value: 'Son-in-law', label: 'Son-in-law (മരുമകൻ)' }, { value: 'Daughter-in-law', label: 'Daughter-in-law (മരുമകൾ)' },
    { value: 'Brother-in-law', label: 'Brother-in-law (അളിയൻ)' }, { value: 'Sister-in-law', label: 'Sister-in-law (നാത്തൂൻ)' },
  ]},
  { group: 'Others', options: [
    { value: 'Nephew', label: 'Nephew (അനന്തിരവൻ)' }, { value: 'Niece', label: 'Niece (അനന്തിരവൾ)' },
    { value: 'Cousin', label: 'Cousin (കസിൻ)' }, { value: 'Other', label: 'Other (മറ്റുള്ളവർ)' },
  ]},
];

function calcAge(dob) {
  if (!dob) return '';
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

export default function ProfilePage() {
  const { user: authUser, fetchUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const [editForm, setEditForm] = useState({});
  const [editPhoto, setEditPhoto] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [areas, setAreas] = useState([]);
  const [groupedAreas, setGroupedAreas] = useState({});
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDd, setShowAreaDd] = useState(false);
  const areaRef = useRef(null);

  useEffect(() => {
    loadProfile();
    areaService.getAll().then(({ data }) => {
      setAreas(data.areas || []);
      setGroupedAreas(data.grouped || {});
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (areaRef.current && !areaRef.current.contains(e.target)) setShowAreaDd(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await authService.getProfile();
      setProfile(data.user);
    } catch {
      Swal.fire('Error', 'Failed to load profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const m = profile?.member || {};
  const family = m.family_members || [];
  const photoUrl = m.photo_path ? `/storage/${m.photo_path}` : null;

  const startEditing = () => {
    setEditForm({
      full_name: m.full_name || profile?.name || '',
      surname: m.surname || '',
      father_name: m.father_name || '',
      residence: m.residence || '',
      area_id: m.area_id || '',
      native_place: m.native_place || '',
      old_membership_no: m.old_membership_no || '',
      new_membership_no: m.new_membership_no || '',
      family_members: family.length > 0 ? JSON.parse(JSON.stringify(family)) : [],
    });
    setEditPhoto(null);
    setEditPhotoPreview(photoUrl);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditPhoto(null);
    setEditPhotoPreview(null);
  };

  const handleChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFamilyChange = (idx, field, value) => {
    setEditForm((prev) => {
      const fam = [...(prev.family_members || [])];
      fam[idx] = { ...fam[idx], [field]: value };
      if (field === 'dob') fam[idx].age = calcAge(value);
      if (field === 'relation' && (value === 'Wife' || value === 'Husband')) fam[idx].marital_status = 'Married';
      return { ...prev, family_members: fam };
    });
  };

  const addFamilyRow = () => {
    setEditForm((prev) => ({
      ...prev,
      family_members: [...(prev.family_members || []), { name: '', relation: '', dob: '', age: '', occupation: '', qualification: '', marital_status: '', contact_number: '', email: '', _isNew: true }],
    }));
  };

  const removeFamilyRow = (idx) => {
    setEditForm((prev) => ({
      ...prev,
      family_members: prev.family_members.filter((_, i) => i !== idx),
    }));
  };

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
      Swal.fire('Validation', 'Full name is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('full_name', editForm.full_name.toUpperCase());
      fd.append('name', editForm.full_name.toUpperCase());
      if (editForm.surname) fd.append('surname', editForm.surname.toUpperCase());
      if (editForm.father_name) fd.append('father_name', editForm.father_name.toUpperCase());
      if (editForm.residence) fd.append('residence', editForm.residence);
      if (editForm.area_id) fd.append('area_id', editForm.area_id);
      if (editForm.native_place) fd.append('native_place', editForm.native_place);
      if (editForm.old_membership_no) fd.append('old_membership_no', editForm.old_membership_no);
      if (editForm.new_membership_no) fd.append('new_membership_no', editForm.new_membership_no);
      if (editForm.family_members?.length > 0) fd.append('family_members', JSON.stringify(editForm.family_members));
      if (editPhoto) fd.append('photo', editPhoto);

      const { data } = await authService.updateProfile(fd);
      setProfile(data.user);
      setEditing(false);
      setEditPhoto(null);
      setEditPhotoPreview(null);
      await fetchUser();
      Swal.fire({ icon: 'success', title: 'Profile Updated', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      Swal.fire('Validation', 'Please fill in all password fields.', 'warning');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      Swal.fire('Validation', 'New password must be at least 8 characters.', 'warning');
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      Swal.fire('Validation', 'New passwords do not match.', 'warning');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.updateProfile(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      Swal.fire({ icon: 'success', title: 'Password Changed', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const getAreaName = (areaId) => {
    const area = areas.find((a) => a.id === Number(areaId));
    return area ? `${area.name}, ${area.region}` : '';
  };

  const filteredAreas = Object.entries(groupedAreas).reduce((acc, [region, items]) => {
    const filtered = items.filter((a) => a.name.toLowerCase().includes(areaSearch.toLowerCase()) || region.toLowerCase().includes(areaSearch.toLowerCase()));
    if (filtered.length > 0) acc[region] = filtered;
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface-200 dark:bg-dark-hover rounded-xl" />
          <div className="h-64 bg-surface-200 dark:bg-dark-hover rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const hasMember = !!profile.member;
  const tabs = [
    { id: 'info', label: 'Profile Info' },
    ...(hasMember ? [{ id: 'family', label: `Family (${family.length})` }] : []),
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">My Profile</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your personal information and security settings</p>
      </motion.div>

      {/* Profile Header Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white dark:bg-dark-surface rounded-xl border border-surface-200 dark:border-dark-border overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary-500 to-primary-700 relative">
          {editing && (
            <label className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium cursor-pointer transition-colors backdrop-blur-sm">
              <CameraIcon className="h-4 w-4" /> Change Photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>
        <div className="px-6 pb-6 -mt-12 flex items-end gap-4">
          <div className="relative">
            {(editing ? editPhotoPreview : photoUrl) ? (
              <img src={editing ? editPhotoPreview : photoUrl} alt="Profile" className="w-24 h-24 rounded-xl object-cover border-4 border-white dark:border-dark-surface shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-4 border-white dark:border-dark-surface shadow-lg overflow-hidden">
                <UserAvatar user={profile} size="2xl" className="!rounded-none !w-full !h-full" />
              </div>
            )}
          </div>
          <div className="flex-1 pt-12 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                {m.full_name || profile.name}{m.surname ? ` ${m.surname}` : ''}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {profile.roles?.map((r) => (
                  <span key={r.id} className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium">
                    {r.name}
                  </span>
                ))}
                <span className="text-xs text-surface-400">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {hasMember && !editing && (
              <button onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shadow-sm">
                <PencilSquareIcon className="h-4 w-4" /> Edit Profile
              </button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <button onClick={cancelEditing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-100 dark:bg-dark-hover hover:bg-surface-200 dark:hover:bg-dark-border text-surface-600 dark:text-surface-400 text-sm font-medium transition-colors">
                  <XMarkIcon className="h-4 w-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
                  <CheckIcon className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-dark-surface rounded-xl border border-surface-200 dark:border-dark-border overflow-hidden">
        <div className="flex border-b border-surface-200 dark:border-dark-border">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              {editing ? (
                <EditInfoSection
                  form={editForm} onChange={handleChange}
                  email={m.email || profile.email} phone={m.phone || profile.phone}
                  areas={areas} groupedAreas={groupedAreas}
                  areaSearch={areaSearch} setAreaSearch={setAreaSearch}
                  showAreaDd={showAreaDd} setShowAreaDd={setShowAreaDd}
                  filteredAreas={filteredAreas} areaRef={areaRef}
                  getAreaName={getAreaName}
                />
              ) : (
                <ViewInfoSection profile={profile} m={m} />
              )}
            </motion.div>
          )}
          {activeTab === 'family' && hasMember && (
            <motion.div key="family" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              {editing ? (
                <EditFamilySection
                  familyMembers={editForm.family_members || []}
                  onFamilyChange={handleFamilyChange}
                  addFamilyRow={addFamilyRow}
                  removeFamilyRow={removeFamilyRow}
                />
              ) : (
                <ViewFamilySection family={family} />
              )}
            </motion.div>
          )}
          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <SecuritySection
                form={passwordForm}
                onChange={(f, v) => setPasswordForm((p) => ({ ...p, [f]: v }))}
                showCurrent={showCurrent} toggleCurrent={() => setShowCurrent(!showCurrent)}
                showNew={showNew} toggleNew={() => setShowNew(!showNew)}
                saving={changingPassword}
                onSave={handlePasswordChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ViewInfoSection({ profile, m }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <InfoField label="Full Name" value={m.full_name || profile.name} />
      <InfoField label="Surname" value={m.surname} />
      <InfoField label="Father's Name" value={m.father_name} />
      <InfoField label="Email" value={m.email || profile.email} />
      <InfoField label="Phone" value={m.phone || profile.phone} />
      <InfoField label="Old Membership No" value={m.old_membership_no} />
      <InfoField label="New Membership No" value={m.new_membership_no} />
      <InfoField label="Residence" value={m.residence} full />
      {m.area && <InfoField label="Area" value={`${m.area.name}, ${m.area.region}`} />}
      <InfoField label="Native Place" value={m.native_place} />
    </div>
  );
}

function InfoField({ label, value, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-surface-900 dark:text-surface-100 mt-0.5 break-words whitespace-pre-wrap">
        {value || <span className="text-surface-300 dark:text-surface-600 italic">Not provided</span>}
      </p>
    </div>
  );
}

function EditInfoSection({ form, onChange, email, phone, areas, groupedAreas, areaSearch, setAreaSearch, showAreaDd, setShowAreaDd, filteredAreas, areaRef, getAreaName }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input type="text" value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Surname</label>
        <input type="text" value={form.surname} onChange={(e) => onChange('surname', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Father&apos;s Name</label>
        <input type="text" value={form.father_name} onChange={(e) => onChange('father_name', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input type="text" value={email || ''} disabled className={disabledCls} />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input type="text" value={phone || ''} disabled className={disabledCls} />
      </div>
      <div>
        <label className={labelCls}>Old Membership No</label>
        <input type="text" value={form.old_membership_no} onChange={(e) => onChange('old_membership_no', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>New Membership No</label>
        <input type="text" value={form.new_membership_no} onChange={(e) => onChange('new_membership_no', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Residence</label>
        <textarea value={form.residence} onChange={(e) => onChange('residence', e.target.value)} rows={2} className={inputCls} />
      </div>
      <div ref={areaRef} className="relative">
        <label className={labelCls}>Area</label>
        <div onClick={() => setShowAreaDd(!showAreaDd)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border cursor-pointer flex items-center justify-between bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100">
          <span className={form.area_id ? '' : 'text-surface-400'}>{form.area_id ? getAreaName(form.area_id) : 'Select area...'}</span>
          <svg className="h-4 w-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
        </div>
        {showAreaDd && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-surface-200 dark:border-dark-border max-h-56 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-surface-200 dark:border-dark-border">
              <input autoFocus type="text" value={areaSearch} onChange={(e) => setAreaSearch(e.target.value)} placeholder="Search area..."
                className="w-full px-3 py-1.5 text-sm rounded-md border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div className="overflow-y-auto flex-1">
              {Object.entries(filteredAreas).length === 0 && <p className="px-3 py-4 text-sm text-surface-400 text-center">No areas found</p>}
              {Object.entries(filteredAreas).map(([region, items]) => (
                <div key={region}>
                  <p className="px-3 py-1 text-[10px] font-bold text-surface-400 uppercase tracking-wider bg-surface-50 dark:bg-dark-hover sticky top-0">{region}</p>
                  {items.map((area) => (
                    <button key={area.id} type="button" onClick={() => { onChange('area_id', area.id); setShowAreaDd(false); setAreaSearch(''); }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 dark:hover:bg-dark-hover ${Number(form.area_id) === area.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-surface-700 dark:text-surface-300'}`}>
                      {area.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {form.area_id && (
              <div className="p-2 border-t border-surface-200 dark:border-dark-border">
                <button type="button" onClick={() => { onChange('area_id', ''); setShowAreaDd(false); }} className="w-full text-xs text-red-500 hover:text-red-600 font-medium py-1">Clear selection</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Native Place</label>
        <input type="text" value={form.native_place} onChange={(e) => onChange('native_place', e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

function ViewFamilySection({ family }) {
  if (family.length === 0) {
    return <p className="text-sm text-surface-400 text-center py-8">No family members added yet.</p>;
  }
  return (
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
  );
}

function EditFamilySection({ familyMembers, onFamilyChange, addFamilyRow, removeFamilyRow }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Family Members ({familyMembers.length})</h4>
        <button type="button" onClick={addFamilyRow} className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors">
          <PlusIcon className="h-4 w-4" /> Add Row
        </button>
      </div>
      {familyMembers.length === 0 ? (
        <p className="text-sm text-surface-400 text-center py-6">No family members. Click &ldquo;Add Row&rdquo; to start adding.</p>
      ) : (
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
              {familyMembers.map((fm, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 text-surface-400">{i + 1}</td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.name} onChange={(e) => onFamilyChange(i, 'name', e.target.value)} className={inputCls + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5">
                    <select value={fm.relation} onChange={(e) => onFamilyChange(i, 'relation', e.target.value)} className={inputCls + ' !py-1.5 !px-2'}>
                      <option value="">--</option>
                      {relationOptions.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input type="date" value={fm.dob || ''} onChange={(e) => onFamilyChange(i, 'dob', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputCls + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.age ?? ''} readOnly tabIndex={-1} className={disabledCls + ' !py-1.5 !px-2 text-center'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.occupation || ''} onChange={(e) => onFamilyChange(i, 'occupation', e.target.value)} className={inputCls + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5"><input type="text" value={fm.qualification || ''} onChange={(e) => onFamilyChange(i, 'qualification', e.target.value)} className={inputCls + ' !py-1.5 !px-2'} /></td>
                  <td className="px-2 py-1.5">
                    <select value={fm.marital_status || ''} onChange={(e) => onFamilyChange(i, 'marital_status', e.target.value)} className={inputCls + ' !py-1.5 !px-2'}>
                      <option value="">--</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {fm._isNew
                      ? <input type="text" value={fm.contact_number || ''} onChange={(e) => onFamilyChange(i, 'contact_number', e.target.value)} className={inputCls + ' !py-1.5 !px-2'} />
                      : <input type="text" value={fm.contact_number || ''} readOnly tabIndex={-1} className={disabledCls + ' !py-1.5 !px-2'} />}
                  </td>
                  <td className="px-2 py-1.5">
                    {fm._isNew
                      ? <input type="email" value={fm.email || ''} onChange={(e) => onFamilyChange(i, 'email', e.target.value)} className={inputCls + ' !py-1.5 !px-2'} />
                      : <input type="email" value={fm.email || ''} readOnly tabIndex={-1} className={disabledCls + ' !py-1.5 !px-2'} />}
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeFamilyRow(i)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecuritySection({ form, onChange, showCurrent, toggleCurrent, showNew, toggleNew, saving, onSave }) {
  return (
    <div className="max-w-md space-y-5">
      <div>
        <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">Change Password</h3>
        <p className="text-sm text-surface-400">Update your password to keep your account secure.</p>
      </div>
      <div>
        <label className={labelCls}>Current Password</label>
        <div className="relative">
          <input type={showCurrent ? 'text' : 'password'} value={form.current_password}
            onChange={(e) => onChange('current_password', e.target.value)} className={inputCls + ' pr-10'} />
          <button type="button" onClick={toggleCurrent} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
            {showCurrent ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={labelCls}>New Password</label>
        <div className="relative">
          <input type={showNew ? 'text' : 'password'} value={form.new_password}
            onChange={(e) => onChange('new_password', e.target.value)} className={inputCls + ' pr-10'} placeholder="Minimum 8 characters" />
          <button type="button" onClick={toggleNew} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
            {showNew ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={labelCls}>Confirm New Password</label>
        <input type="password" value={form.new_password_confirmation}
          onChange={(e) => onChange('new_password_confirmation', e.target.value)} className={inputCls} />
      </div>
      <button onClick={onSave} disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
        {saving ? 'Changing...' : 'Change Password'}
      </button>
    </div>
  );
}
