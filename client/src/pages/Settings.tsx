import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../i18n/LanguageProvider';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import {
  User, Lock, Bell, AlertTriangle, Globe,
  Save, Loader2, Trash2, ShieldAlert,
} from 'lucide-react';
import { AvatarUploader } from '../components/ui/AvatarUploader';
import { SettingCard } from '../components/ui/SettingCard';
import { SettingsRow } from '../components/ui/SettingsRow';
import { Toggle } from '../components/ui/Toggle';
import toast from 'react-hot-toast';

type Tab = 'account' | 'notifications' | 'preferences' | 'danger';

export function Settings() {
  const { user, setUser, logout } = useAuth();
  const { settings, update, isSaving } = useSettings();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tabs: { id: Tab; icon: typeof User; label: string }[] = [
    { id: 'account', icon: User, label: t('settings.account') },
    { id: 'notifications', icon: Bell, label: t('settings.notifications') },
    { id: 'preferences', icon: Globe, label: t('settings.preferences') },
    { id: 'danger', icon: AlertTriangle, label: t('settings.danger') },
  ];

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get('username') as string;
    const email = fd.get('email') as string;
    setSavingProfile(true);
    try {
      const res = await userApi.updateProfile({ username, email });
      setUser(res.data.data);
      toast.success(t('settings.profileUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settings.updateFailed'));
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
    if (newPassword !== confirmPassword) { toast.error(t('settings.passwordsMismatch')); return; }
    setSavingPassword(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success(t('settings.passwordUpdated'));
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settings.updateFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(t('settings.deleteAccountConfirm'));
    if (!confirmed) return;
    setDeleting(true);
    try {
      await userApi.deleteAccount();
      toast.success(t('settings.accountDeleted'));
      await logout();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settings.deleteFailed'));
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-black">
            {t('settings.title')}
          </motion.h1>
          {isSaving && (
            <span className="flex items-center gap-2 text-sm text-dark-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary-400" /> {t('settings.saving')}
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
                    <SettingCard icon={User} title={t('settings.profile')} description={t('settings.profileDesc')}>
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
                          <label className="label">{t('settings.username')}</label>
                          <input name="username" defaultValue={user?.username} required minLength={3}
                            className="input" />
                        </div>
                        <div>
                          <label className="label">{t('settings.email')}</label>
                          <input name="email" type="email" defaultValue={user?.email} required
                            className="input" />
                        </div>
                        <button type="submit" disabled={savingProfile} className="btn-primary">
                          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {t('settings.saveChanges')}
                        </button>
                      </form>
                    </SettingCard>

                    <SettingCard icon={Lock} title={t('settings.security')} description={t('settings.securityDesc')} index={1}>
                      <form onSubmit={handlePasswordChange} className="space-y-4 px-5 py-5">
                        <div>
                          <label className="label">{t('settings.currentPassword')}</label>
                          <input name="currentPassword" type="password" required className="input" />
                        </div>
                        <div>
                          <label className="label">{t('settings.newPassword')}</label>
                          <input name="newPassword" type="password" required minLength={8} className="input" />
                        </div>
                        <div>
                          <label className="label">{t('settings.confirmPassword')}</label>
                          <input name="confirmPassword" type="password" required minLength={8} className="input" />
                        </div>
                        <button type="submit" disabled={savingPassword} className="btn-primary">
                          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                          {t('settings.updatePassword')}
                        </button>
                      </form>
                    </SettingCard>
                  </>
                )}


                {/* -------------------- NOTIFICATIONS -------------------- */}
                {activeTab === 'notifications' && (
                  <SettingCard icon={Bell} title={t('settings.notifications')} description={t('settings.notificationsDesc')}>
                    <SettingsRow
                      title={t('settings.emailUpdates')}
                      description={t('settings.emailUpdatesDesc')}
                      control={<Toggle checked={settings.notifications.emailUpdates} onChange={(v) => update({ notifications: { ...settings.notifications, emailUpdates: v } })} label={t('settings.emailUpdates')} />}
                    />
                    <SettingsRow
                      title={t('settings.newReleases')}
                      description={t('settings.newReleasesDesc')}
                      control={<Toggle checked={settings.notifications.newReleases} onChange={(v) => update({ notifications: { ...settings.notifications, newReleases: v } })} label={t('settings.newReleases')} />}
                    />
                    <SettingsRow
                      title={t('settings.watchlistUpdates')}
                      description={t('settings.watchlistUpdatesDesc')}
                      control={<Toggle checked={settings.notifications.watchlist} onChange={(v) => update({ notifications: { ...settings.notifications, watchlist: v } })} label={t('settings.watchlistUpdates')} />}
                    />
                    <SettingsRow
                      title={t('settings.commentsReplies')}
                      description={t('settings.commentsRepliesDesc')}
                      control={<Toggle checked={settings.notifications.comments} onChange={(v) => update({ notifications: { ...settings.notifications, comments: v } })} label={t('settings.commentsReplies')} />}
                    />
                  </SettingCard>
                )}

                {/* -------------------- PREFERENCES -------------------- */}
                {activeTab === 'preferences' && (
                  <SettingCard icon={Globe} title={t('settings.preferences')} description={t('settings.languageDesc')}>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{t('settings.language')}</p>
                        <p className="mt-0.5 text-xs text-dark-400">{t('settings.languageDesc')}</p>
                      </div>
                      <LanguageSwitcher />
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
                        <h3 className="text-sm font-bold text-white">{t('settings.dangerTitle')}</h3>
                        <p className="text-xs text-dark-400">{t('settings.dangerDesc')}</p>
                      </div>
                    </header>
                    <div className="divide-y divide-white/[0.04]">
                      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{t('settings.deleteAccount')}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-dark-400">
                            {t('settings.deleteAccountDesc')}
                          </p>
                        </div>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="btn shrink-0 border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          {t('settings.deleteAccountBtn')}
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
