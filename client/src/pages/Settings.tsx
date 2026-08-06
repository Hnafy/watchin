import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import {
  User, Lock, Bell, Eye, MonitorPlay, Palette, AlertTriangle,
  Save, Loader2, Trash2, ShieldAlert,
} from 'lucide-react';
import { AvatarUploader } from '../components/ui/AvatarUploader';
import { SettingCard } from '../components/ui/SettingCard';
import { SettingsRow } from '../components/ui/SettingsRow';
import { Toggle } from '../components/ui/Toggle';
import toast from 'react-hot-toast';

type Tab = 'account' | 'privacy' | 'notifications' | 'playback' | 'appearance' | 'danger';

const tabs: { id: Tab; icon: typeof User; label: string }[] = [
  { id: 'account', icon: User, label: 'Account' },
  { id: 'privacy', icon: Eye, label: 'Privacy' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'playback', icon: MonitorPlay, label: 'Playback' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'danger', icon: AlertTriangle, label: 'Danger Zone' },
];

export function Settings() {
  const { user, setUser, logout } = useAuth();
  const { settings, update, isSaving } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get('username') as string;
    const email = fd.get('email') as string;
    setSavingProfile(true);
    try {
      const res = await userApi.updateProfile({ username, email });
      setUser(res.data.data);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword') as string;
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'This will permanently delete your account, watch history, watchlist, and ratings. This cannot be undone. Continue?'
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await userApi.deleteAccount();
      toast.success('Account deleted');
      await logout();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-black">
            Settings
          </motion.h1>
          {isSaving && (
            <span className="flex items-center gap-2 text-sm text-dark-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary-400" /> Saving...
            </span>
          )}
        </div>

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
                className="space-y-5"
              >
                {/* -------------------- ACCOUNT -------------------- */}
                {activeTab === 'account' && (
                  <>
                    <SettingCard icon={User} title="Profile" description="Your public identity on Watchin">
                      <div className="flex items-center gap-4 px-5 py-4">
                        <AvatarUploader size="lg" />
                        <div>
                          <p className="font-semibold text-white">{user?.username}</p>
                          <p className="text-sm text-dark-400">{user?.email}</p>
                          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-dark-500">
                            {user?.role}
                          </p>
                        </div>
                      </div>
                      <form onSubmit={handleProfileSave} className="space-y-4 px-5 py-5">
                        <div>
                          <label className="label">Username</label>
                          <input name="username" defaultValue={user?.username} required minLength={3}
                            className="input" />
                        </div>
                        <div>
                          <label className="label">Email</label>
                          <input name="email" type="email" defaultValue={user?.email} required
                            className="input" />
                        </div>
                        <button type="submit" disabled={savingProfile} className="btn-primary">
                          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Changes
                        </button>
                      </form>
                    </SettingCard>

                    <SettingCard icon={Lock} title="Security" description="Keep your account safe" index={1}>
                      <form onSubmit={handlePasswordChange} className="space-y-4 px-5 py-5">
                        <div>
                          <label className="label">Current Password</label>
                          <input name="currentPassword" type="password" required className="input" />
                        </div>
                        <div>
                          <label className="label">New Password</label>
                          <input name="newPassword" type="password" required minLength={8} className="input" />
                        </div>
                        <div>
                          <label className="label">Confirm New Password</label>
                          <input name="confirmPassword" type="password" required minLength={8} className="input" />
                        </div>
                        <button type="submit" disabled={savingPassword} className="btn-primary">
                          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                          Update Password
                        </button>
                      </form>
                    </SettingCard>
                  </>
                )}

                {/* -------------------- PRIVACY -------------------- */}
                {activeTab === 'privacy' && (
                  <SettingCard icon={Eye} title="Privacy" description="Control who can see your activity">
                    <SettingsRow
                      title="Public profile"
                      description="Allow other users to view your profile page"
                      control={<Toggle checked={settings.privacy.publicProfile} onChange={(v) => update({ privacy: { ...settings.privacy, publicProfile: v } })} label="Public profile" />}
                    />
                    <SettingsRow
                      title="Show watch history"
                      description="Display your recent watch activity on your profile"
                      control={<Toggle checked={settings.privacy.showWatchHistory} onChange={(v) => update({ privacy: { ...settings.privacy, showWatchHistory: v } })} label="Show watch history" />}
                    />
                    <SettingsRow
                      title="Show stats & achievements"
                      description="Display your stats, badges, and activity heatmap"
                      control={<Toggle checked={settings.privacy.showStats} onChange={(v) => update({ privacy: { ...settings.privacy, showStats: v } })} label="Show stats & achievements" />}
                    />
                  </SettingCard>
                )}

                {/* -------------------- NOTIFICATIONS -------------------- */}
                {activeTab === 'notifications' && (
                  <SettingCard icon={Bell} title="Notifications" description="Choose what you want to be notified about">
                    <SettingsRow
                      title="Email updates"
                      description="Product news, features, and occasional updates"
                      control={<Toggle checked={settings.notifications.emailUpdates} onChange={(v) => update({ notifications: { ...settings.notifications, emailUpdates: v } })} label="Email updates" />}
                    />
                    <SettingsRow
                      title="New releases"
                      description="Get notified when new movies and shows are added"
                      control={<Toggle checked={settings.notifications.newReleases} onChange={(v) => update({ notifications: { ...settings.notifications, newReleases: v } })} label="New releases" />}
                    />
                    <SettingsRow
                      title="Watchlist updates"
                      description="Updates about titles in your list"
                      control={<Toggle checked={settings.notifications.watchlist} onChange={(v) => update({ notifications: { ...settings.notifications, watchlist: v } })} label="Watchlist updates" />}
                    />
                    <SettingsRow
                      title="Comments & replies"
                      description="When someone comments or replies to you"
                      control={<Toggle checked={settings.notifications.comments} onChange={(v) => update({ notifications: { ...settings.notifications, comments: v } })} label="Comments & replies" />}
                    />
                  </SettingCard>
                )}

                {/* -------------------- PLAYBACK -------------------- */}
                {activeTab === 'playback' && (
                  <SettingCard icon={MonitorPlay} title="Playback" description="Customize how videos play">
                    <SettingsRow
                      title="Autoplay"
                      description="Start playing videos automatically when you open the player"
                      control={<Toggle checked={settings.playback.autoplay} onChange={(v) => update({ playback: { ...settings.playback, autoplay: v } })} label="Autoplay" />}
                    />
                    <SettingsRow
                      title="Resume playback"
                      description="Pick up where you left off instead of restarting"
                      control={<Toggle checked={settings.playback.resume} onChange={(v) => update({ playback: { ...settings.playback, resume: v } })} label="Resume playback" />}
                    />
                    <SettingsRow
                      title="Default quality"
                      description="Preferred stream quality when available"
                      control={
                        <select
                          value={settings.playback.defaultQuality}
                          onChange={(e) => update({ playback: { ...settings.playback, defaultQuality: e.target.value as any } })}
                          className="input w-auto min-w-32 px-3 py-2 text-sm"
                        >
                          <option value="auto">Auto</option>
                          <option value="1080p">1080p</option>
                          <option value="720p">720p</option>
                          <option value="480p">480p</option>
                        </select>
                      }
                    />
                  </SettingCard>
                )}

                {/* -------------------- APPEARANCE -------------------- */}
                {activeTab === 'appearance' && (
                  <SettingCard icon={Palette} title="Appearance" description="Tune how Watchin looks and feels">
                    <SettingsRow
                      title="Reduce motion"
                      description="Minimize animations and transitions across the app"
                      control={<Toggle checked={settings.appearance.reduceMotion} onChange={(v) => update({ appearance: { reduceMotion: v } })} label="Reduce motion" />}
                    />
                    <div className="px-5 py-4 text-xs text-dark-500">
                      Theme is locked to the dark cinema look for now — more themes coming soon.
                    </div>
                  </SettingCard>
                )}

                {/* -------------------- DANGER ZONE -------------------- */}
                {activeTab === 'danger' && (
                  <motion.section
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm"
                  >
                    <header className="flex items-center gap-3 border-b border-red-500/15 px-5 py-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                        <ShieldAlert className="h-[18px] w-[18px]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Danger Zone</h3>
                        <p className="text-xs text-dark-400">Irreversible actions</p>
                      </div>
                    </header>
                    <div className="divide-y divide-white/[0.04]">
                      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">Delete account</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-dark-400">
                            Permanently removes your account, watch history, watchlist, and ratings.
                          </p>
                        </div>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="btn shrink-0 border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </motion.section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
