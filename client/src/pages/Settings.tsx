import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { User, Lock, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'password' | 'notifications';

const tabs: { id: Tab; icon: typeof User; label: string }[] = [
  { id: 'profile', icon: User, label: 'Account' },
  { id: 'password', icon: Lock, label: 'Password' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
];

export function Settings() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get('username') as string;
    const email = fd.get('email') as string;
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ username, email });
      setUser(res.data.data);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword') as string;
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-black mb-8">
          Settings
        </motion.h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-w-0 ${
                    activeTab === id
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6 sm:p-8"
              >
                {/* Profile */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleProfileSave} className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-500/30" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold ring-2 ring-primary-500/30">
                          {user?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{user?.username}</p>
                        <p className="text-sm text-white/40">{user?.email}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1.5">Username</label>
                      <input name="username" defaultValue={user?.username} required minLength={3}
                        className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
                      <input name="email" type="email" defaultValue={user?.email} required
                        className="input" />
                    </div>
                    <button type="submit" disabled={saving}
                      className="btn-primary">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {/* Password */}
                {activeTab === 'password' && (
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1.5">Current Password</label>
                      <input name="currentPassword" type="password" required
                        className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1.5">New Password</label>
                      <input name="newPassword" type="password" required minLength={8}
                        className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1.5">Confirm Password</label>
                      <input name="confirmPassword" type="password" required minLength={8}
                        className="input" />
                    </div>
                    <button type="submit" disabled={saving}
                      className="btn-primary">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    {[
                      { label: 'Email Notifications', desc: 'Receive updates about new content', key: 'emailNotif' },
                      { label: 'Push Notifications', desc: 'Get notified about watchlist updates', key: 'pushNotif' },
                    ].map(({ label, desc, key }) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="font-medium text-white">{label}</p>
                          <p className="text-sm text-white/40">{desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={key === 'emailNotif'} />
                          <div className="w-11 h-6 bg-dark-600 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
