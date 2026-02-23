import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarIcon, MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';
import { eventService } from '../services/eventService';
import StatusBadge from '../components/StatusBadge';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', event_date: '', status: 'draft' });
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole('Manager', 'Admin', 'Super Admin');

  useEffect(() => {
    eventService.getAll().then(({ data }) => setEvents(data.data || [])).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await eventService.create(form);
      setEvents((prev) => [data.event, ...prev]);
      setShowForm(false);
      setForm({ title: '', description: '', location: '', event_date: '', status: 'draft' });
      toast.success('Event created');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((m) => toast.error(m));
      else toast.error('Failed to create event');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Archive this event?')) return;
    try {
      await eventService.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success('Event archived');
    } catch { toast.error('Failed to archive'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Events</h1>
          <p className="text-surface-500 mt-1">Community events and activities</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
            <PlusIcon className="h-5 w-5" /> New Event
          </button>
        )}
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleCreate}
          className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Date & Time</label>
            <input type="datetime-local" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-surface text-surface-700 dark:text-surface-300 outline-none">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
            <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-dark-border bg-white dark:bg-dark-bg text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">Create Event</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface-100 dark:bg-dark-hover text-surface-600 dark:text-surface-400 rounded-lg">Cancel</button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <motion.div key={event.id} variants={item}
              className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">{event.title}</h3>
                  <StatusBadge status={event.status} />
                </div>
                {event.description && <p className="text-sm text-surface-500 mb-4 line-clamp-2">{event.description}</p>}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-surface-500">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(event.event_date).toLocaleString()}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-surface-500">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="px-6 py-3 bg-surface-50 dark:bg-dark-hover border-t border-surface-200 dark:border-dark-border flex justify-end">
                  <button onClick={() => handleDelete(event.id)} className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium">Archive</button>
                </div>
              )}
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full py-12 text-center text-surface-400">No events found</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
