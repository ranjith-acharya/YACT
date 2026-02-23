import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { SkeletonCard } from '../components/SkeletonLoader';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/roles').then(({ data }) => setRoles(data.roles || [])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Roles</h1>
        <p className="text-surface-500 mt-1">Role overview and user counts</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <motion.div key={role.id} variants={item}
            className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-surface-100">{role.name}</h3>
            </div>
            <p className="text-sm text-surface-500">
              {role.users_count} {role.users_count === 1 ? 'user' : 'users'} assigned
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
