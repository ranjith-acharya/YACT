import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, TrashIcon, UserPlusIcon, XMarkIcon, CameraIcon, EyeIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { memberRequestService } from '../services/memberRequestService';
import { areaService } from '../services/areaService';
import StatusBadge from '../components/StatusBadge';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const emptyFamilyRow = { name: '', relation: '', dob: '', age: '', occupation: '', qualification: '', marital_status: '', contact_number: '', email: '' };

function calcAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

const initialForm = {
  full_name: '',
  surname: '',
  father_name: '',
  email: '',
  phone: '',
  residence: '',
  area_id: '',
  native_place: '',
  address: '',
  old_membership_no: '',
  new_membership_no: '',
  family_members: [{ ...emptyFamilyRow }],
};

const labelClass = 'block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1';
const errorMsgClass = 'text-xs text-red-500 mt-1';
const validMsgClass = 'text-xs text-emerald-500 mt-1';

const PHONE_REGEX = /^\+?\d[\d\s]{6,18}\d$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s.'()-]+$/;
const DIGITS_ONLY = /^\d+$/;
const BLOCK_LETTER_FIELDS = ['full_name', 'surname', 'father_name', 'residence', 'native_place', 'address'];
const FAMILY_BLOCK_FIELDS = ['name', 'occupation', 'qualification'];
const MARRIED_RELATIONS = ['Wife', 'Husband', 'Father-in-law', 'Mother-in-law', 'Son-in-law', 'Daughter-in-law', 'Brother-in-law', 'Sister-in-law'];

function validateField(field, value, form) {
  const v = typeof value === 'string' ? value.trim() : value;

  switch (field) {
    case 'full_name':
      if (!v) return 'Name is required';
      if (v.length < 2) return 'At least 2 characters';
      if (!NAME_REGEX.test(v)) return 'Letters, spaces, dots, hyphens only';
      return null;
    case 'surname':
      if (!v) return null;
      if (!NAME_REGEX.test(v)) return 'Letters, spaces, dots, hyphens only';
      return null;
    case 'father_name':
      if (!v) return null;
      if (!NAME_REGEX.test(v)) return 'Letters, spaces, dots, hyphens only';
      return null;
    case 'email':
      if (!v) return null;
      if (!EMAIL_REGEX.test(v)) return 'Invalid email format';
      return null;
    case 'phone':
      if (!v) return null;
      if (!/^[\d\s+]+$/.test(v)) return 'Digits, spaces, and + only';
      if (!PHONE_REGEX.test(v) || v.replace(/\D/g, '').length < 7 || v.replace(/\D/g, '').length > 15) return '7-15 digits required';
      return null;
    case 'residence':
      if (!v && !form.address.trim()) return 'Residence or address is required';
      return null;
    case 'old_membership_no':
    case 'new_membership_no':
      if (!v) return null;
      if (!DIGITS_ONLY.test(v)) return 'Digits only';
      return null;
    default:
      return null;
  }
}

function validateFamilyField(field, value, row) {
  const v = typeof value === 'string' ? value.trim() : value;
  const hasAnyData = Object.values(row).some((x) => x && String(x).trim());

  switch (field) {
    case 'name':
      if (hasAnyData && !v) return 'Name required';
      if (v && !NAME_REGEX.test(v)) return 'Letters only';
      return null;
    case 'relation':
      if (hasAnyData && !v) return 'Select relation';
      return null;
    case 'dob': {
      if (!v) return null;
      const d = new Date(v);
      if (isNaN(d.getTime())) return 'Invalid date';
      if (d > new Date()) return 'Cannot be future date';
      const age = calcAge(v);
      if (age === '' || Number(age) > 150) return 'Invalid date of birth';
      return null;
    }
    case 'contact_number':
      if (!v) return null;
      if (!/^[\d\s+]+$/.test(v)) return 'Digits only';
      if (!PHONE_REGEX.test(v) || v.replace(/\D/g, '').length < 7 || v.replace(/\D/g, '').length > 15) return '7-15 digits';
      return null;
    case 'email':
      if (!v) return null;
      if (!EMAIL_REGEX.test(v)) return 'Invalid email';
      return null;
    default:
      return null;
  }
}

function getBorderClass(touched, error, value, isRequired) {
  if (!touched) return 'border-surface-300 dark:border-dark-border';
  if (error) return 'border-red-400 ring-1 ring-red-200 dark:ring-red-900/40';
  const hasValue = value && String(value).trim();
  if (hasValue || isRequired) return 'border-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-900/40';
  return 'border-surface-300 dark:border-dark-border';
}

function getFamilyBorderClass(touched, error, value) {
  if (!touched) return 'border-surface-200 dark:border-dark-border';
  if (error) return 'border-red-400';
  if (value && String(value).trim()) return 'border-emerald-400';
  return 'border-surface-200 dark:border-dark-border';
}

export default function MemberRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...initialForm, family_members: [{ ...emptyFamilyRow }] });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [familyErrors, setFamilyErrors] = useState([{}]);
  const [familyTouched, setFamilyTouched] = useState([{}]);
  const [submitting, setSubmitting] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [areas, setAreas] = useState([]);
  const [groupedAreas, setGroupedAreas] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const bulkInputRef = useRef(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef(null);
  const { hasAnyRole } = useAuth();
  const canApprove = hasAnyRole('Manager', 'Admin', 'Super Admin');

  useEffect(() => {
    areaService.getAll().then(({ data }) => {
      setAreas(data.areas || []);
      setGroupedAreas(data.grouped || {});
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (areaRef.current && !areaRef.current.contains(e.target)) setShowAreaDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getAreaName = (areaId) => {
    const area = areas.find((a) => a.id === Number(areaId));
    return area ? `${area.name}, ${area.region}` : '';
  };

  const filteredGroupedAreas = Object.entries(groupedAreas).reduce((acc, [region, items]) => {
    const filtered = items.filter((a) => a.name.toLowerCase().includes(areaSearch.toLowerCase()) || region.toLowerCase().includes(areaSearch.toLowerCase()));
    if (filtered.length > 0) acc[region] = filtered;
    return acc;
  }, {});

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select a JPG, PNG, or WebP image.', confirmButtonColor: '#5c7cfa' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Photo must be under 2 MB.', confirmButtonColor: '#5c7cfa' });
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    memberRequestService.getAll()
      .then(({ data }) => setRequests(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const runFieldValidation = useCallback((field, value, updatedForm) => {
    const err = validateField(field, value, updatedForm);
    setErrors((prev) => ({ ...prev, [field]: err }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const updateField = (field) => (e) => {
    const raw = e.target.value;
    const value = BLOCK_LETTER_FIELDS.includes(field) ? raw.toUpperCase() : raw;
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    runFieldValidation(field, value, updatedForm);

    if (field === 'address' || field === 'residence') {
      const otherField = field === 'residence' ? 'address' : 'residence';
      if (touched[otherField] || touched[field]) {
        const otherErr = validateField('residence', updatedForm.residence, updatedForm);
        setErrors((prev) => ({ ...prev, residence: otherErr }));
      }
    }
  };

  const runFamilyValidation = useCallback((index, field, row) => {
    const err = validateFamilyField(field, row[field], row);
    setFamilyErrors((prev) => {
      const updated = [...prev];
      while (updated.length <= index) updated.push({});
      updated[index] = { ...updated[index], [field]: err };
      return updated;
    });
    setFamilyTouched((prev) => {
      const updated = [...prev];
      while (updated.length <= index) updated.push({});
      updated[index] = { ...updated[index], [field]: true };
      return updated;
    });
  }, []);

  const updateFamilyField = (index, field) => (e) => {
    const raw = e.target.value;
    const value = FAMILY_BLOCK_FIELDS.includes(field) ? raw.toUpperCase() : raw;

    setForm((prev) => {
      const updated = [...prev.family_members];
      const row = { ...updated[index], [field]: value };

      if (field === 'dob') {
        row.age = calcAge(value);
      }

      if (field === 'relation' && MARRIED_RELATIONS.includes(raw)) {
        row.marital_status = 'Married';
      }

      updated[index] = row;

      setTimeout(() => {
        runFamilyValidation(index, field, row);
        if (field === 'name' || field === 'relation') {
          const nameErr = validateFamilyField('name', row.name, row);
          const relErr = validateFamilyField('relation', row.relation, row);
          setFamilyErrors((p) => {
            const u = [...p];
            while (u.length <= index) u.push({});
            u[index] = { ...u[index], name: nameErr, relation: relErr };
            return u;
          });
        }
      }, 0);

      return { ...prev, family_members: updated };
    });
  };

  const addFamilyRow = () => {
    setForm((prev) => ({
      ...prev,
      family_members: [...prev.family_members, { ...emptyFamilyRow }],
    }));
    setFamilyErrors((prev) => [...prev, {}]);
    setFamilyTouched((prev) => [...prev, {}]);
  };

  const removeFamilyRow = (index) => {
    if (form.family_members.length <= 1) return;
    setForm((prev) => ({ ...prev, family_members: prev.family_members.filter((_, i) => i !== index) }));
    setFamilyErrors((prev) => prev.filter((_, i) => i !== index));
    setFamilyTouched((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setForm({ ...initialForm, family_members: [{ ...emptyFamilyRow }] });
    setErrors({});
    setTouched({});
    setFamilyErrors([{}]);
    setFamilyTouched([{}]);
    removePhoto();
    setShowForm(false);
  };

  const validateAll = () => {
    const allErrors = {};
    const fields = ['full_name', 'surname', 'father_name', 'email', 'phone', 'residence', 'old_membership_no', 'new_membership_no'];
    const allTouched = {};
    fields.forEach((f) => {
      allTouched[f] = true;
      const err = validateField(f, form[f], form);
      if (err) allErrors[f] = err;
    });
    setTouched(allTouched);
    setErrors(allErrors);

    const fErrors = [];
    const fTouched = [];
    let hasFamilyErr = false;
    form.family_members.forEach((row) => {
      const rowErr = {};
      const rowTouch = {};
      ['name', 'relation', 'dob', 'contact_number'].forEach((f) => {
        rowTouch[f] = true;
        const err = validateFamilyField(f, row[f], row);
        if (err) { rowErr[f] = err; hasFamilyErr = true; }
      });
      fErrors.push(rowErr);
      fTouched.push(rowTouch);
    });
    setFamilyErrors(fErrors);
    setFamilyTouched(fTouched);

    return { fieldErrors: allErrors, hasFamilyErr };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fieldErrors, hasFamilyErr } = validateAll();
    const hasFieldErr = Object.keys(fieldErrors).length > 0;

    if (hasFieldErr || hasFamilyErr) {
      const msgs = Object.values(fieldErrors);
      let html = '';
      if (msgs.length) html += `<ul style="text-align:left;margin:0 0 8px;padding-left:18px">${msgs.map((m) => `<li>${m}</li>`).join('')}</ul>`;
      if (hasFamilyErr) html += '<p style="margin:0">Family members table has errors.</p>';
      Swal.fire({ icon: 'warning', title: 'Please fix the errors', html, confirmButtonColor: '#5c7cfa' });
      return;
    }

    const cleanFamily = form.family_members.filter((fm) =>
      Object.values(fm).some((v) => v && String(v).trim())
    );

    const memberData = {
      ...form,
      family_members: cleanFamily.length > 0 ? cleanFamily : null,
    };

    const payload = new FormData();
    payload.append('member_data', JSON.stringify(memberData));
    if (photo) payload.append('photo', photo);

    setSubmitting(true);
    try {
      const { data } = await memberRequestService.create(payload);
      setRequests((prev) => [data.member_request, ...prev]);
      resetForm();
      Swal.fire({ icon: 'success', title: 'Request Submitted', text: 'The member application has been submitted for review.', confirmButtonColor: '#5c7cfa', timer: 3000, timerProgressBar: true });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const msgs = Object.values(serverErrors).flat().join('\n');
        Swal.fire({ icon: 'error', title: 'Validation Error', text: msgs, confirmButtonColor: '#5c7cfa' });
      } else {
        Swal.fire({ icon: 'error', title: 'Submission Failed', text: 'Something went wrong.', confirmButtonColor: '#5c7cfa' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data } = await memberRequestService.downloadTemplate();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'member-requests-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Swal.fire({ icon: 'error', title: 'Download failed', text: 'Could not download template.', confirmButtonColor: '#5c7cfa' });
    }
  };

  const handleBulkImport = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportLoading(true);

    const showResult = (data) => {
      const failed = data.failed ?? 0;
      const created = data.created ?? 0;
      const errors = data.errors ?? [];
      const msg = data.message || `${created} created, ${failed} failed.`;

      let html = `<p class="mb-1">${msg}</p>`;
      if (errors.length > 0) {
        const hasEmail = errors.some((e) => e.email != null && e.email !== '');
        const hasPhone = errors.some((e) => e.phone != null && e.phone !== '');
        let header = '<thead><tr class="border-b border-gray-300"><th class="py-2 px-2 text-left text-xs font-semibold uppercase text-gray-500 w-12">Row</th><th class="py-2 px-2 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">Name</th>';
        if (hasEmail) header += '<th class="py-2 px-2 text-left text-xs font-semibold uppercase text-gray-500 min-w-[140px]">Email</th>';
        if (hasPhone) header += '<th class="py-2 px-2 text-left text-xs font-semibold uppercase text-gray-500 min-w-[100px]">Phone</th>';
        header += '<th class="py-2 px-2 text-left text-xs font-semibold uppercase text-gray-500 min-w-[280px]">Issue</th></tr></thead><tbody>';
        html += '<div class="text-left mt-3 max-h-[50vh] overflow-auto"><table class="w-full text-sm border-collapse" style="min-width: 520px">' + header;
        const colCount = 3 + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0);
        errors.slice(0, 20).forEach((err) => {
          html += `<tr class="border-b border-gray-200"><td class="py-2 px-2 font-medium">${err.row}</td><td class="py-2 px-2 whitespace-nowrap">${err.name ?? '—'}</td>`;
          if (hasEmail) html += `<td class="py-2 px-2 text-gray-700 break-all">${err.email ?? '—'}</td>`;
          if (hasPhone) html += `<td class="py-2 px-2 text-gray-700">${err.phone ?? '—'}</td>`;
          html += `<td class="py-2 px-2 text-red-600 align-top" style="min-width: 260px">${err.message}</td></tr>`;
        });
        if (errors.length > 20) html += `<tr><td colspan="${colCount}" class="py-2 px-2 text-gray-500">... and ${errors.length - 20} more</td></tr>`;
        html += '</tbody></table></div>';
      }

      const icon = created > 0 ? 'success' : (failed > 0 ? 'warning' : 'info');
      Swal.fire({ icon, title: created > 0 ? 'Bulk Import' : 'Import Result', html, confirmButtonColor: '#5c7cfa', width: 720 });
      if (created > 0 || failed > 0) memberRequestService.getAll().then(({ data }) => setRequests(data.data || [])).catch(() => {});
    };

    try {
      const response = await memberRequestService.bulkImport(file);
      showResult(response?.data ?? {});
    } catch (err) {
      const data = err?.response?.data;
      if (data && (data.created !== undefined || data.failed !== undefined || data.errors)) {
        showResult(data);
      } else {
        const msg = data?.message || err?.message || 'Something went wrong during import.';
        Swal.fire({ icon: 'error', title: 'Import Error', html: `<p>${msg}</p>`, confirmButtonColor: '#5c7cfa' });
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const result = await Swal.fire({
      title: 'Approve this request?',
      text: 'A user account and member profile will be created.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;
    try {
      const { data } = await memberRequestService.approve(id, '');
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));

      let credentialsHtml = '';
      if (data.credentials) {
        credentialsHtml = `
          <p class="mb-3">Member account has been created with the following credentials:</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:left;font-size:14px;">
            <p><strong>Email:</strong> ${data.credentials.email}</p>
            <p class="mt-1"><strong>Password:</strong> ${data.credentials.password}</p>
          </div>
          <p class="mt-3 text-xs" style="color:#6b7280;">Please share these credentials with the member securely.</p>
        `;
      }

      let autoLinkHtml = '';
      if (data.auto_linked) {
        const methodLabel = data.auto_linked.method === 'email' ? 'email match' : "father's name match";
        autoLinkHtml = `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;text-align:left;font-size:14px;margin-top:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">Auto-linked</span>
              <span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500;">${methodLabel}</span>
            </div>
            <p style="margin:6px 0 0;"><strong>Linked to parent:</strong> ${data.auto_linked.parent_name}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Is this correct? If not, you can manually change or remove the link from the member's detail view.</p>
          </div>
        `;
      }

      if (credentialsHtml || autoLinkHtml) {
        Swal.fire({
          icon: 'success',
          title: 'Approved!',
          html: credentialsHtml + autoLinkHtml,
          confirmButtonColor: '#5c7cfa',
          width: 520,
        });
      } else {
        Swal.fire({ icon: 'success', title: 'Approved!', text: 'Existing account has been restored.', confirmButtonColor: '#5c7cfa', timer: 2500, timerProgressBar: true });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || 'Could not approve.', confirmButtonColor: '#5c7cfa' });
    }
  };

  const handleReject = async (id) => {
    const { value: notes, isConfirmed } = await Swal.fire({
      title: 'Reject this request?',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Please explain why this request is being rejected...',
      inputAttributes: { rows: 4 },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Please provide a reason for rejection';
        if (value.trim().length < 5) return 'Reason must be at least 5 characters';
      },
    });
    if (!isConfirmed) return;
    try {
      await memberRequestService.reject(id, notes);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected', review_notes: notes } : r)));
      Swal.fire({ icon: 'info', title: 'Rejected', text: 'The request has been rejected.', confirmButtonColor: '#5c7cfa', timer: 2500, timerProgressBar: true });
    } catch {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not reject.', confirmButtonColor: '#5c7cfa' });
    }
  };

  const inp = (field, isRequired = false) => {
    const border = getBorderClass(touched[field], errors[field], form[field], isRequired);
    return `w-full px-3 py-2 rounded-lg border ${border} bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm`;
  };

  const fieldMsg = (field) => {
    if (!touched[field]) return null;
    if (errors[field]) return <p className={errorMsgClass}>{errors[field]}</p>;
    const v = form[field];
    if (v && String(v).trim()) return <p className={validMsgClass}>Looks good</p>;
    return null;
  };

  const famInp = (i, field) => {
    const border = getFamilyBorderClass(familyTouched[i]?.[field], familyErrors[i]?.[field], form.family_members[i]?.[field]);
    return `w-full px-2 py-1.5 text-sm rounded border ${border} bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-1 focus:ring-primary-500 outline-none transition-all`;
  };

  const famMsg = (i, field) => {
    if (!familyTouched[i]?.[field]) return null;
    if (familyErrors[i]?.[field]) return <p className="text-[10px] text-red-500 mt-0.5">{familyErrors[i][field]}</p>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Member Requests</h1>
          <p className="text-surface-500 mt-1">Submit and review directory applications</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-100 dark:bg-dark-hover text-surface-700 dark:text-surface-300 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download template
          </button>
          <button
            type="button"
            onClick={() => bulkInputRef.current?.click()}
            disabled={importLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-100 dark:bg-dark-hover text-surface-700 dark:text-surface-300 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            {importLoading ? 'Importing...' : 'Bulk import'}
          </button>
          <input
            ref={bulkInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleBulkImport}
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            {showForm ? <XMarkIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            {showForm ? 'Close Form' : 'New Application'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} noValidate className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border overflow-hidden">
              <div className="bg-primary-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white">Information for Directory</h2>
                <p className="text-primary-200 text-sm mt-0.5">Alakkal Charitable Trust &middot; Member Application Form</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Photo Upload */}
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-28 h-32 rounded-lg border-2 border-dashed border-surface-300 dark:border-dark-border bg-surface-50 dark:bg-dark-hover flex items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors overflow-hidden group"
                    >
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <CameraIcon className="h-6 w-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <CameraIcon className="h-8 w-8 mx-auto text-surface-400 dark:text-surface-500" />
                          <p className="text-[10px] text-surface-400 mt-1">Upload Photo</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                    {photoPreview && (
                      <button type="button" onClick={removePhoto} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                    )}
                  </div>
                  <div className="flex-1 text-xs text-surface-400 dark:text-surface-500 pt-2">
                    <p className="font-medium text-surface-600 dark:text-surface-300 text-sm mb-1">Member Photo</p>
                    <p>Passport-size photo (JPG, PNG, WebP)</p>
                    <p>Maximum file size: 2 MB</p>
                  </div>
                </div>

                {/* Membership Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Old Directory Membership No</label>
                    <input type="text" value={form.old_membership_no} onChange={updateField('old_membership_no')} className={inp('old_membership_no')} placeholder="e.g. 1234" />
                    {fieldMsg('old_membership_no')}
                  </div>
                  <div>
                    <label className={labelClass}>New Membership No</label>
                    <input type="text" value={form.new_membership_no} onChange={updateField('new_membership_no')} className={inp('new_membership_no')} placeholder="e.g. 5678" />
                    {fieldMsg('new_membership_no')}
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.full_name} onChange={updateField('full_name')} className={inp('full_name', true)} placeholder="Full name (BLOCK LETTERS)" />
                    {fieldMsg('full_name')}
                  </div>
                  <div>
                    <label className={labelClass}>Surname</label>
                    <input type="text" value={form.surname} onChange={updateField('surname')} className={inp('surname')} placeholder="Surname (optional)" />
                    {fieldMsg('surname')}
                  </div>
                  <div>
                    <label className={labelClass}>Father's Name</label>
                    <input type="text" value={form.father_name} onChange={updateField('father_name')} className={inp('father_name')} placeholder="Father's full name" />
                    {fieldMsg('father_name')}
                  </div>
                </div>

                {/* Address + Area */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Residence (Mumbai / Thane) <span className="text-red-500">*</span></label>
                    <input type="text" value={form.residence} onChange={updateField('residence')} className={inp('residence', true)} placeholder="Current residential address in Mumbai, Thane, Navi Mumbai etc." />
                    {fieldMsg('residence')}
                  </div>
                  <div ref={areaRef} className="relative">
                    <label className={labelClass}>Area</label>
                    <div
                      onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 dark:border-dark-border cursor-pointer flex items-center justify-between bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100"
                    >
                      <span className={form.area_id ? '' : 'text-surface-400'}>{form.area_id ? getAreaName(form.area_id) : 'Select area...'}</span>
                      <svg className="h-4 w-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                    {showAreaDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-surface-200 dark:border-dark-border max-h-64 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-surface-200 dark:border-dark-border">
                          <input
                            autoFocus type="text" value={areaSearch} onChange={(e) => setAreaSearch(e.target.value)}
                            placeholder="Search area..."
                            className="w-full px-3 py-1.5 text-sm rounded-md border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1">
                          {Object.entries(filteredGroupedAreas).length === 0 && (
                            <p className="px-3 py-4 text-sm text-surface-400 text-center">No areas found</p>
                          )}
                          {Object.entries(filteredGroupedAreas).map(([region, items]) => (
                            <div key={region}>
                              <p className="px-3 py-1.5 text-[10px] font-bold text-surface-400 uppercase tracking-wider bg-surface-50 dark:bg-dark-hover sticky top-0">{region}</p>
                              {items.map((area) => (
                                <button key={area.id} type="button"
                                  onClick={() => { setForm((prev) => ({ ...prev, area_id: area.id })); setShowAreaDropdown(false); setAreaSearch(''); }}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 dark:hover:bg-dark-hover transition-colors ${Number(form.area_id) === area.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-surface-700 dark:text-surface-300'}`}
                                >
                                  {area.name}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        {form.area_id && (
                          <div className="p-2 border-t border-surface-200 dark:border-dark-border">
                            <button type="button" onClick={() => { setForm((prev) => ({ ...prev, area_id: '' })); setShowAreaDropdown(false); }}
                              className="w-full text-xs text-red-500 hover:text-red-600 font-medium py-1">Clear selection</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Native Place</label>
                  <input type="text" value={form.native_place} onChange={updateField('native_place')} className={inp('native_place')} placeholder="Hometown / native village" />
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Contact Number (WhatsApp)</label>
                    <input type="text" value={form.phone} onChange={updateField('phone')} className={inp('phone')} placeholder="+91 98765 43210" />
                    {fieldMsg('phone')}
                  </div>
                  <div>
                    <label className={labelClass}>Email ID</label>
                    <input type="text" value={form.email} onChange={updateField('email')} className={inp('email')} placeholder="email@example.com" />
                    {fieldMsg('email')}
                  </div>
                </div>

                {/* Family Members Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-surface-800 dark:text-surface-200">Family Members</label>
                    <button type="button" onClick={addFamilyRow}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30 font-medium transition-colors">
                      <UserPlusIcon className="h-4 w-4" /> Add Row
                    </button>
                  </div>

                  <div className="border border-surface-200 dark:border-dark-border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm min-w-[1050px]">
                      <thead>
                        <tr className="bg-surface-50 dark:bg-dark-hover text-surface-600 dark:text-surface-400">
                          <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                          <th className="px-3 py-2 text-left font-semibold">Name</th>
                          <th className="px-3 py-2 text-left font-semibold">Relation</th>
                          <th className="px-3 py-2 text-left font-semibold">DOB</th>
                          <th className="px-3 py-2 text-left font-semibold w-12">Age</th>
                          <th className="px-3 py-2 text-left font-semibold">Occupation</th>
                          <th className="px-3 py-2 text-left font-semibold">Qualification</th>
                          <th className="px-3 py-2 text-left font-semibold">Marital Status</th>
                          <th className="px-3 py-2 text-left font-semibold">Contact (WhatsApp)</th>
                          <th className="px-3 py-2 text-left font-semibold">Email</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
                        {form.family_members.map((fm, i) => (
                          <tr key={i} className="group">
                            <td className="px-3 py-2 text-surface-400 font-medium">{i + 1}</td>
                            <td className="px-1 py-1">
                              <input type="text" value={fm.name} onChange={updateFamilyField(i, 'name')} className={famInp(i, 'name')} />
                              {famMsg(i, 'name')}
                            </td>
                            <td className="px-1 py-1">
                              <select value={fm.relation} onChange={updateFamilyField(i, 'relation')} className={famInp(i, 'relation')}>
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
                              {famMsg(i, 'relation')}
                            </td>
                            <td className="px-1 py-1">
                              <input type="date" value={fm.dob} onChange={updateFamilyField(i, 'dob')} max={new Date().toISOString().split('T')[0]} className={famInp(i, 'dob')} />
                              {famMsg(i, 'dob')}
                            </td>
                            <td className="px-1 py-1">
                              <input type="text" value={fm.age} readOnly tabIndex={-1} className="w-full px-2 py-1.5 text-sm rounded border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-hover text-surface-500 dark:text-surface-400 outline-none cursor-default text-center" />
                            </td>
                            <td className="px-1 py-1">
                              <input type="text" value={fm.occupation} onChange={updateFamilyField(i, 'occupation')} className={famInp(i, 'occupation')} />
                            </td>
                            <td className="px-1 py-1">
                              <input type="text" value={fm.qualification} onChange={updateFamilyField(i, 'qualification')} className={famInp(i, 'qualification')} />
                            </td>
                            <td className="px-1 py-1">
                              <select value={fm.marital_status} onChange={updateFamilyField(i, 'marital_status')} className={famInp(i, 'marital_status')}>
                                <option value="">--</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              <input type="text" value={fm.contact_number} onChange={updateFamilyField(i, 'contact_number')} className={famInp(i, 'contact_number')} />
                              {famMsg(i, 'contact_number')}
                            </td>
                            <td className="px-1 py-1">
                              <input type="email" value={fm.email} onChange={updateFamilyField(i, 'email')} className={famInp(i, 'email')} placeholder="email@example.com" />
                              {famMsg(i, 'email')}
                            </td>
                            <td className="px-1 py-1 text-center">
                              {form.family_members.length > 1 && (
                                <button type="button" onClick={() => removeFamilyRow(i)}
                                  className="p-1 rounded text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Important Notes</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                    <li>Please fill in BLOCK letters with full details</li>
                    <li>Incomplete forms will not be processed</li>
                    <li>Residence must be your current address in Mumbai, Thane, Navi Mumbai etc.</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                  <button type="button" onClick={resetForm}
                    className="px-6 py-2.5 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== REQUESTS TABLE ===== */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 dark:bg-dark-hover">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Submitted By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
                {requests.map((req) => (
                  <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => setViewRequest(req)}
                    className="hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <p className="font-medium text-surface-900 dark:text-surface-100">{req.member_data?.full_name}</p>
                      {req.member_data?.father_name && <p className="text-xs text-surface-400">{(() => { const fam = req.member_data?.family_members || []; for (const fm of fam) { if (fm.relation === 'Wife') return 'S/O'; if (fm.relation === 'Husband') return 'D/O'; } return 'C/O'; })()} {req.member_data.father_name}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-surface-600 dark:text-surface-400">{req.member_data?.phone}</p>
                      <p className="text-xs text-surface-400">{req.member_data?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">{req.submitter?.name}</td>
                    <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                    <td className="px-6 py-4 text-sm text-surface-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {canApprove && req.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(req.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium transition-colors">
                            Approve
                          </button>
                          <button onClick={() => handleReject(req.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium transition-colors">
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-surface-400">No requests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      <AnimatePresence>
        {viewRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewRequest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-surface-200 dark:border-dark-border w-full max-w-7xl max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const d = viewRequest.member_data || {};
                const family = d.family_members || [];
                const photoUrl = d.photo_path ? `/storage/${d.photo_path}` : null;
                return (
                  <>
                    <div className="bg-primary-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                      <div>
                        <h2 className="text-lg font-bold text-white">Application Details</h2>
                        <p className="text-primary-200 text-sm">
                          Submitted by {viewRequest.submitter?.name} on {new Date(viewRequest.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={viewRequest.status} />
                        <button onClick={() => setViewRequest(null)} className="text-white/70 hover:text-white transition-colors">
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Photo + Basic Info */}
                      <div className="flex items-start gap-6">
                        {photoUrl ? (
                          <img src={photoUrl} alt="Member" className="w-24 h-28 rounded-lg object-cover border border-surface-200 dark:border-dark-border flex-shrink-0" />
                        ) : (
                          <div className="w-24 h-28 rounded-lg bg-surface-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl font-bold text-surface-300 dark:text-surface-600">{d.full_name?.charAt(0) || '?'}</span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">{d.full_name}{d.surname ? ` ${d.surname}` : ''}</h3>
                          {d.father_name && <p className="text-sm text-surface-500">{(() => { const fam = d.family_members || []; for (const fm of fam) { if (fm.relation === 'Wife') return 'S/O'; if (fm.relation === 'Husband') return 'D/O'; } return 'C/O'; })()} {d.father_name}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600 dark:text-surface-400 pt-1">
                            {d.phone && <span>Ph: {d.phone}</span>}
                            {d.email && <span>Email: {d.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailField label="Old Membership No" value={d.old_membership_no} />
                        <DetailField label="New Membership No" value={d.new_membership_no} />
                        <DetailField label="Residence" value={d.residence} full />
                        {d.area_id && <DetailField label="Area" value={getAreaName(d.area_id)} />}
                        <DetailField label="Native Place" value={d.native_place} full />
                      </div>

                      {/* Family Members */}
                      {family.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Family Members ({family.length})</h4>
                          <div className="border border-surface-200 dark:border-dark-border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm min-w-[800px]">
                              <thead>
                                <tr className="bg-surface-50 dark:bg-dark-hover text-surface-500">
                                  <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                                  <th className="px-3 py-2 text-left font-semibold">Relation</th>
                                  <th className="px-3 py-2 text-left font-semibold">Age / DOB</th>
                                  <th className="px-3 py-2 text-left font-semibold">Occupation</th>
                                  <th className="px-3 py-2 text-left font-semibold">Qualification</th>
                                  <th className="px-3 py-2 text-left font-semibold">Marital Status</th>
                                  <th className="px-3 py-2 text-left font-semibold">Contact</th>
                                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-100 dark:divide-dark-border">
                                {family.map((fm, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 text-surface-400">{i + 1}</td>
                                    <td className="px-3 py-2 font-medium text-surface-900 dark:text-surface-100">{fm.name}</td>
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

                      {/* Review Info */}
                      {viewRequest.status !== 'pending' && viewRequest.reviewer && (
                        <div className="bg-surface-50 dark:bg-dark-hover rounded-lg p-4">
                          <p className="text-sm text-surface-600 dark:text-surface-400">
                            <span className="font-medium">{viewRequest.status === 'approved' ? 'Approved' : 'Rejected'}</span> by {viewRequest.reviewer.name}
                            {viewRequest.reviewed_at && <> on {new Date(viewRequest.reviewed_at).toLocaleDateString()}</>}
                          </p>
                          {viewRequest.review_notes && (
                            <p className="text-sm text-surface-500 mt-1">Notes: {viewRequest.review_notes}</p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 pt-2 border-t border-surface-200 dark:border-dark-border">
                        {canApprove && viewRequest.status === 'pending' && (
                          <>
                            <button
                              onClick={async () => { setViewRequest(null); await handleApprove(viewRequest.id); }}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Approve & Create Member
                            </button>
                            <button
                              onClick={async () => { setViewRequest(null); await handleReject(viewRequest.id); }}
                              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setViewRequest(null)}
                          className="px-5 py-2 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 font-medium rounded-lg hover:bg-surface-200 dark:hover:bg-dark-border transition-colors text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
