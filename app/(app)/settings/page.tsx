'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUsername, updatePassword, deleteAccount, exportUserData, exportUserDataCsv } from '@/actions/habitLogs';
import { updateBirthDate, wipeHabitLogs, importUserData } from '@/actions/settings';
import { listSessions, revokeSession, revokeAllOtherSessions } from '@/actions/sessions';
import { UserSession } from '@/types';
import { logout } from '@/actions/auth';
import { purgeSessionCaches } from '@/lib/purgeCaches';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/components/ThemeProvider';
import { usePrefs } from '@/components/PrefsProvider';
import { SunIcon, MoonIcon, DownloadIcon, TrashIcon, LogoutIcon, WhatsAppIcon } from '@/components/icons';
import { APP_SUPPORT } from '@/lib/support';
import { useFeedback } from '@/components/FeedbackProvider';
import { FeedbackSection } from '@/components/FeedbackSection';
import { hapticSupported } from '@/lib/feedback';
import { BnKeys } from '@/lib/i18n/bn';
import { FrequencyType } from '@/types';

const APP_VERSION = '1.0.0';

type SectionId = 'account' | 'appearance' | 'notifications' | 'defaults' | 'ai' | 'data' | 'feedback' | 'about';

function Seg<T extends string | number>({
  options,
  value,
  onPick,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onPick(o.value)}
          className={`px-3.5 py-2 rounded border text-xs font-semibold transition-all disabled:opacity-50 ${
            value === o.value
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onFlip,
  disabled,
  label,
}: {
  checked: boolean;
  onFlip: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onFlip(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
        checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-missed)]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Row({ label, help, right }: { label: React.ReactNode; help?: string; right: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-[var(--color-border)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {help && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{help}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function SoonBadge() {
  return (
    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-accent)]/15 text-[#D97724] dark:text-[#F4A259]">
      শীঘ্রই
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { prefs, t, update } = usePrefs();
  const [section, setSection] = useState<SectionId>('account');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (partial: Parameters<typeof update>[0]) => {
    setSaving(true);
    const ok = await update(partial);
    setSaving(false);
    toast(ok ? t('settings.saved') : t('settings.saveFailed'), ok ? 'success' : 'error');
  };

  const TABS: { id: SectionId; label: string }[] = [
    { id: 'account', label: t('settings.account') },
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'notifications', label: t('settings.notifications') },
    { id: 'defaults', label: t('settings.habitDefaults') },
    { id: 'ai', label: t('settings.aiAgent') },
    { id: 'data', label: t('settings.dataPrivacy') },
    { id: 'feedback', label: t('settings.feedbackTab') },
    { id: 'about', label: t('settings.about') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Mobile: slide-in section drawer */}
      <div className="sm:hidden">
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)} className="w-full gap-2">
          <span>☰</span>
          <span>{TABS.find((tb) => tb.id === section)?.label}</span>
        </Button>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-[var(--color-card-bg)] border-r border-[var(--color-border)] shadow-2xl p-4 flex flex-col gap-1.5"
            role="dialog"
            aria-label="Settings sections"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] px-2 pb-2">
              {t('settings.title')}
            </p>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSection(tab.id);
                  setDrawerOpen(false);
                }}
                className={`px-3.5 py-3 rounded text-sm font-medium text-left transition-colors ${
                  section === tab.id
                    ? 'border-l-4 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </aside>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Desktop: vertical sidebar */}
        <div className="hidden sm:flex sm:flex-col gap-1.5 w-52 shrink-0 sticky top-4" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={section === tab.id}
              onClick={() => setSection(tab.id)}
              className={`px-3.5 py-2.5 rounded text-sm font-medium text-left transition-colors ${
                section === tab.id
                  ? 'border-l-4 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 w-full">
          {section === 'account' && <AccountSection t={t} toast={toast} router={router} />}
          {section === 'appearance' && (
            <AppearanceSection t={t} prefsTheme={theme} setAppTheme={setTheme} save={save} saving={saving} />
          )}
          {section === 'notifications' && <NotificationsSection t={t} save={save} saving={saving} toast={toast} />}
          {section === 'defaults' && <DefaultsSection t={t} save={save} saving={saving} />}
          {section === 'ai' && <AiSection t={t} save={save} saving={saving} />}
          {section === 'data' && <DataSection t={t} toast={toast} router={router} />}
          {section === 'feedback' && (
            <FeedbackSection t={t} bn={prefs.language === 'bn'} version={APP_VERSION} />
          )}
          {section === 'about' && <AboutSection t={t} onJumpToFeedback={() => setSection('feedback')} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Account
function AccountSection({
  t,
  toast,
  router,
}: {
  t: (k: BnKeys) => string;
  toast: (msg: string, type: 'success' | 'error' | 'info') => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [birthPass, setBirthPass] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthLoading, setBirthLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { prefs } = usePrefs();
  const bn = prefs.language === 'bn';
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  React.useEffect(() => {
    listSessions().then((res) => {
      if (res.success) setSessions(res.data);
      setSessionsLoading(false);
    });
  }, []);

  const handleRevoke = async (id: string, current: boolean) => {
    const res = await revokeSession(id);
    if (res.success) {
      if (current) {
        router.push('/login');
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast(t('settings.saved'), 'success');
    } else toast(res.error, 'error');
  };

  const handleRevokeOthers = async () => {
    const res = await revokeAllOtherSessions();
    if (res.success) {
      toast(bn ? `${res.data} ডিভাইস থেকে লগআউট হয়েছে` : `Logged out ${res.data} device(s)`, 'success');
      const refreshed = await listSessions();
      if (refreshed.success) setSessions(refreshed.data);
    } else toast(res.error, 'error');
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setUsernameLoading(true);
    try {
      const res = await updateUsername(newUsername.trim());
      if (res.success) {
        toast(t('settings.saved'), 'success');
        setNewUsername('');
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast(t('settings.saveFailed'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast(t('settings.saveFailed'), 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await updatePassword(currentPassword, newPassword);
      if (res.success) {
        toast(t('settings.saved'), 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateBirthDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthPass || !birthDate) return;
    setBirthLoading(true);
    try {
      const res = await updateBirthDate(birthPass, birthDate);
      if (res.success) {
        toast(t('settings.saved'), 'success');
        setBirthPass('');
        setBirthDate('');
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setBirthLoading(false);
    }
  };

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      await purgeSessionCaches();
      router.push('/login');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      toast('Please type "delete" to confirm', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        // The account is gone; so must any cached copy of its pages.
        await purgeSessionCaches();
        router.push('/login');
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{t('settings.username')}</h2>
        <form onSubmit={handleUpdateUsername} className="space-y-4 max-w-md mt-3">
          <Input label={t('settings.newUsername')} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={usernameLoading} required />
          <Button type="submit" variant="primary" size="sm" isLoading={usernameLoading} disabled={!newUsername.trim()}>
            {t('settings.saveUsername')}
          </Button>
        </form>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{t('settings.updatePassword')}</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md mt-3">
          <Input label={t('settings.currentPassword')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={passwordLoading} required />
          <Input label={t('settings.newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordLoading} required />
          <Input label={t('settings.confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={passwordLoading} required />
          <Button type="submit" variant="primary" size="sm" isLoading={passwordLoading}>
            {t('settings.updatePassword')}
          </Button>
        </form>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{t('settings.birthDate')}</h2>
        <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.birthDateHelp')}</p>
        <form onSubmit={handleUpdateBirthDate} className="space-y-4 max-w-md mt-3">
          <Input label={t('settings.currentPassword')} type="password" value={birthPass} onChange={(e) => setBirthPass(e.target.value)} disabled={birthLoading} required />
          <Input label={t('settings.birthDate')} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={birthLoading} required />
          <Button type="submit" variant="primary" size="sm" isLoading={birthLoading}>
            {t('settings.updateBirthDate')}
          </Button>
        </form>
      </Card>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
              {bn ? 'সেশন' : 'Session'}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'এই ডিভাইস থেকে লগআউট করুন।' : 'Log out from this device.'}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="gap-2 shrink-0">
            <LogoutIcon size={16} />
            <span>Logout</span>
          </Button>
        </div>
      </Card>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
              {bn ? 'সক্রিয় ডিভাইস' : 'Active devices'}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'কোথায় কোথায় login আছে দেখুন।' : 'See where you are logged in.'}
            </p>
          </div>
          {sessions.filter((s) => !s.current).length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleRevokeOthers} className="shrink-0">
              {bn ? 'অন্য সব ডিভাইস থেকে লগআউট' : 'Log out other devices'}
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {sessionsLoading ? (
            <p className="text-xs text-[var(--color-text-secondary)]">{t('common.loading')}</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)]">—</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded border border-[var(--color-border)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">
                    {s.device || (bn ? 'অজানা ডিভাইস' : 'Unknown device')}
                    {s.current && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                        {bn ? 'এই ডিভাইস' : 'This device'}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {bn ? 'শেষ সক্রিয়' : 'Last active'}: {new Date(s.last_seen).toLocaleString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(s.id, !!s.current)}>
                  {bn ? 'লগআউট' : 'Revoke'}
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card padding="md" className="border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-danger)] mb-1">{t('settings.deleteAccount')}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'অ্যাকাউন্ট ও সব ডেটা স্থায়ীভাবে মুছে যাবে।' : 'Permanently deletes your account and all data.'}
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="gap-2 shrink-0">
            <TrashIcon size={16} />
            <span>{t('settings.deleteAccount')}</span>
          </Button>
        </div>
      </Card>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('settings.deleteAccount')}>
        <div className="space-y-4">
          <Input placeholder="Type 'delete' to confirm" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={deleteLoading}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAccount} isLoading={deleteLoading} disabled={deleteConfirmText.toLowerCase() !== 'delete'}>
              {t('settings.deleteAccount')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- Appearance
function AppearanceSection({
  t,
  prefsTheme,
  setAppTheme,
  save,
  saving,
}: {
  t: (k: BnKeys) => string;
  prefsTheme: string;
  setAppTheme: (th: 'light' | 'dark') => void;
  save: (p: Parameters<ReturnType<typeof usePrefs>['update']>[0]) => Promise<void>;
  saving: boolean;
}) {
  const { prefs } = usePrefs();
  const { soundEnabled, hapticsEnabled, setFlags } = useFeedback();
  const hapticsOk = hapticSupported();
  const fb = { soundEnabled, hapticsEnabled };
  const pickTheme = (v: 'light' | 'dark' | 'system' | 'high-contrast') => {
    if (v === 'light' || v === 'dark') setAppTheme(v);
    save({ theme: v });
  };
  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row label={t('settings.theme')} right={
          <Seg
            value={prefs.theme}
            disabled={saving}
            onPick={pickTheme}
            options={[
              { value: 'light', label: `☀️ ${t('settings.light')}` },
              { value: 'dark', label: `🌙 ${t('settings.dark')}` },
              { value: 'system', label: `💻 ${t('settings.system')}` },
                { value: 'high-contrast', label: `◐ ${t('settings.highContrast')}` },
            ]}
          />
        } />
        <Row
          label={t('settings.highContrast')}
          help={t('settings.highContrastHelp')}
          right={
            <button
              type="button"
              disabled={saving}
              onClick={() => pickTheme(prefs.theme === 'high-contrast' ? 'light' : 'high-contrast')}
              className={`px-3.5 py-2 rounded border text-xs font-semibold transition-all disabled:opacity-50 ${
                prefs.theme === 'high-contrast'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {prefs.theme === 'high-contrast'
                ? (prefs.language === 'bn' ? 'চালু ✓' : 'On ✓')
                : (prefs.language === 'bn' ? 'বন্ধ' : 'Off')}
            </button>
          }
        />
        <Row label={t('settings.accent')} right={
          <div className="flex items-center gap-2">
            <div className="max-w-[260px]">
              <ColorPicker label="" value={prefs.accent || '#2E7D6B'} onChange={(c) => save({ accent: c })} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => save({ accent: null })} disabled={saving || !prefs.accent}>
              {t('settings.accentDefault')}
            </Button>
          </div>
        } />
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-0.5">
            {t('settings.feedback')}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {t('settings.feedbackHelp')}
          </p>
          <Row
            label={<span>{t('settings.sound')} 🔊</span> as unknown as string}
            right={
              <Toggle
                checked={fb.soundEnabled}
                onFlip={(v) => setFlags({ soundEnabled: v })}
                label={t('settings.sound')}
              />
            }
          />
          <Row
            label={
              <span>
                {t('settings.vibration')} 📳
                {!hapticsOk && (
                  <span className="ml-2 text-[10px] font-normal text-[var(--color-text-secondary)]">
                    ({t('settings.vibrationUnsupported')})
                  </span>
                )}
              </span>
            }
            right={
              <Toggle
                checked={fb.hapticsEnabled}
                onFlip={(v) => setFlags({ hapticsEnabled: v })}
                disabled={!hapticsOk}
                label={t('settings.vibration')}
              />
            }
          />
        </div>

        <Row label={t('settings.language')} right={
          <Seg
            value={prefs.language}
            disabled={saving}
            onPick={(v) => save({ language: v })}
            options={[
              { value: 'bn', label: 'বাংলা' },
              { value: 'en', label: 'English' },
            ]}
          />
        } />
        <Row label={t('settings.weekStart')} right={
          <Seg
            value={prefs.weekStart}
            disabled={saving}
            onPick={(v) => save({ weekStart: v })}
            options={[
              { value: 6, label: prefs.language === 'bn' ? 'শনি' : 'Sat' },
              { value: 0, label: prefs.language === 'bn' ? 'রবি' : 'Sun' },
              { value: 1, label: prefs.language === 'bn' ? 'সোম' : 'Mon' },
            ]}
          />
        } />
        <Row label={t('settings.dateFormat')} right={
          <Seg
            value={prefs.dateFormat}
            disabled={saving}
            onPick={(v) => save({ dateFormat: v })}
            options={[
              { value: 'DD/MM/YYYY', label: '31/12/2026' },
              { value: 'MM/DD/YYYY', label: '12/31/2026' },
              { value: 'YYYY-MM-DD', label: '2026-12-31' },
            ]}
          />
        } />
        <Row label={t('settings.timeFormat')} right={
          <Seg
            value={prefs.hour12 ? 'h12' : 'h24'}
            disabled={saving}
            onPick={(v) => save({ hour12: v === 'h12' })}
            options={[
              { value: 'h12', label: t('settings.hour12') },
              { value: 'h24', label: t('settings.hour24') },
            ]}
          />
        } />
        <span className="hidden">{prefsTheme}</span>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Notifications
function NotificationsSection({
  t,
  save,
  saving,
  toast,
}: {
  t: (k: BnKeys) => string;
  save: (p: Parameters<ReturnType<typeof usePrefs>['update']>[0]) => Promise<void>;
  saving: boolean;
  toast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const { prefs } = usePrefs();
  const n = prefs.notifications;

  const toggleEnabled = async (v: boolean) => {
    if (v && 'Notification' in window && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast(t('settings.saveFailed'), 'error');
          return;
        }
      } catch {
        toast(t('settings.saveFailed'), 'error');
        return;
      }
    }
    save({ notifications: { ...n, enabled: v } });
  };

  const timeInput = (
    value: string | null,
    onPick: (v: string | null) => void,
    placeholder: string
  ) => (
    <div className="flex gap-2 items-center">
      <input
        type="time"
        value={value || ''}
        disabled={saving || !n.enabled}
        onChange={(e) => onPick(e.target.value || null)}
        className="min-h-[44px] px-3 py-2 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
        aria-label={placeholder}
      />
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onPick(null)} disabled={saving}>
          ✕
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row label={t('settings.reminders')} right={<Toggle checked={n.enabled} onFlip={toggleEnabled} disabled={saving} label={t('settings.reminders')} />} />
        <Row
          label={t('settings.dailySummary')}
          help={prefs.language === 'bn' ? 'প্রতিটা হ্যাবিটের আলাদা রিমাইন্ডার Add Habit পেজে সেট করুন।' : 'Set per-habit reminders on the Add Habit page.'}
          right={timeInput(n.dailySummaryTime, (v) => save({ notifications: { ...n, dailySummaryTime: v } }), t('settings.dailySummary'))}
        />
        <Row
          label={t('settings.quietHours')}
          right={
            <div className="flex gap-2 items-center">
              {timeInput(n.quietStart, (v) => save({ notifications: { ...n, quietStart: v } }), 'start')}
              <span className="text-xs text-[var(--color-text-secondary)]">–</span>
              {timeInput(n.quietEnd, (v) => save({ notifications: { ...n, quietEnd: v } }), 'end')}
            </div>
          }
        />
        <Row label={t('settings.streakWarning')} right={<Toggle checked={n.streakWarning} onFlip={(v) => save({ notifications: { ...n, streakWarning: v } })} disabled={saving || !n.enabled} label={t('settings.streakWarning')} />} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Defaults
function DefaultsSection({
  t,
  save,
  saving,
}: {
  t: (k: BnKeys) => string;
  save: (p: Parameters<ReturnType<typeof usePrefs>['update']>[0]) => Promise<void>;
  saving: boolean;
}) {
  const { prefs } = usePrefs();
  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row label={t('settings.defaultCategory')} right={
          <select
            value={prefs.defaultCategory}
            disabled={saving}
            onChange={(e) => save({ defaultCategory: e.target.value })}
            className="min-h-[44px] px-3 py-2 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
          >
            {['health', 'study', 'productivity', 'mindfulness', 'custom'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        } />
        <Row label={t('settings.defaultColor')} right={
          <div className="max-w-[260px]">
            <ColorPicker label="" value={prefs.defaultColor} onChange={(c) => save({ defaultColor: c })} />
          </div>
        } />
        <Row label={t('settings.defaultFrequency')} right={
          <Seg
            value={prefs.defaultFrequency}
            disabled={saving}
            onPick={(v: FrequencyType) => save({ defaultFrequency: v })}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'specific_days', label: prefs.language === 'bn' ? 'নির্দিষ্ট দিন' : 'Days' },
              { value: 'times_per_week', label: prefs.language === 'bn' ? 'সাপ্তাহিক' : 'Weekly' },
            ]}
          />
        } />
        <Row
          label={t('settings.dayStart')}
          help={t('settings.dayStartHelp')}
          right={
            <Seg
              value={prefs.dayStartHour}
              disabled={saving}
              onPick={(v) => save({ dayStartHour: v })}
              options={[0, 1, 2, 3, 4, 5].map((h) => ({ value: h, label: prefs.hour12 ? `${h === 0 ? 12 : h} AM` : `${String(h).padStart(2, '0')}:00` }))}
            />
          }
        />
        <Row
          label={<span>{t('settings.graceDays')}<SoonBadge /></span>}
          help={t('settings.graceDaysHelp')}
          right={
            <Seg
              value={prefs.graceDaysPerMonth}
              disabled={saving}
              onPick={(v) => save({ graceDaysPerMonth: v })}
              options={[0, 1, 2, 3].map((g) => ({ value: g, label: String(g) }))}
            />
          }
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- AI
function AiSection({
  t,
  save,
  saving,
}: {
  t: (k: BnKeys) => string;
  save: (p: Parameters<ReturnType<typeof usePrefs>['update']>[0]) => Promise<void>;
  saving: boolean;
}) {
  const { prefs } = usePrefs();
  const ai = prefs.ai;
  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row
          label={t('settings.aiActions')}
          help={t('settings.aiActionsHelp')}
          right={
            <Toggle
              checked={ai.allowActions !== false}
              onFlip={(v) => save({ ai: { ...ai, allowActions: v } })}
              disabled={saving}
              label={t('settings.aiActions')}
            />
          }
        />
        <Row
          label={<span>{t('settings.aiProactivity')}<SoonBadge /></span>}
          right={
            <Seg
              value={ai.proactivity}
              disabled={saving}
              onPick={(v) => save({ ai: { ...ai, proactivity: v } })}
              options={[
                { value: 'manual', label: t('settings.proManual') },
                { value: 'daily_tip', label: t('settings.proDailyTip') },
                { value: 'weekly_report', label: t('settings.proWeeklyReport') },
              ]}
            />
          }
        />
        <Row label={t('settings.replyLength')} right={
          <Seg
            value={ai.replyLength}
            disabled={saving}
            onPick={(v) => save({ ai: { ...ai, replyLength: v } })}
            options={[
              { value: 'short', label: t('settings.lenShort') },
              { value: 'normal', label: t('settings.lenNormal') },
              { value: 'detailed', label: t('settings.lenDetailed') },
            ]}
          />
        } />
        <Row
          label={t('settings.language')}
          help={prefs.language === 'bn' ? 'চ্যাট প্যানেলেও আলাদা করে বদলানো যায়।' : 'Can also be changed inside the chat panel.'}
          right={
            <Seg
              value={ai.language}
              disabled={saving}
              onPick={(v) => save({ ai: { ...ai, language: v } })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'bn', label: 'বাংলা' },
                { value: 'en', label: 'English' },
              ]}
            />
          }
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Data
function DataSection({
  t,
  toast,
  router,
}: {
  t: (k: BnKeys) => string;
  toast: (msg: string, type: 'success' | 'error' | 'info') => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { prefs } = usePrefs();
  const bn = prefs.language === 'bn';
  const [exportLoading, setExportLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);

  const download = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-export-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (csv: boolean) => {
    if (csv) setExportCsvLoading(true);
    else setExportLoading(true);
    try {
      const res = csv ? await exportUserDataCsv() : await exportUserData();
      if (res.success) {
        download(res.data, csv ? 'text/csv;charset=utf-8' : 'application/json', csv ? 'csv' : 'json');
        toast(t('settings.saved'), 'success');
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      if (csv) setExportCsvLoading(false);
      else setExportLoading(false);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImportLoading(true);
    try {
      const text = await file.text();
      const res = await importUserData(text, file.name);
      if (res.success) {
        toast(
          bn ? `${res.data.habits} habit, ${res.data.logs} log ইমপোর্ট হয়েছে` : `Imported ${res.data.habits} habits, ${res.data.logs} logs`,
          'success'
        );
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleWipe = async () => {
    if (wipeText.toLowerCase() !== 'delete') {
      toast('Please type "delete" to confirm', 'error');
      return;
    }
    setWipeLoading(true);
    try {
      const res = await wipeHabitLogs();
      if (res.success) {
        toast(bn ? `${res.data} log মুছে গেছে` : `Erased ${res.data} logs`, 'info');
        setIsWipeOpen(false);
        setWipeText('');
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast(t('settings.saveFailed'), 'error');
    } finally {
      setWipeLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row
          label={bn ? 'এক্সপোর্ট' : 'Export'}
          right={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExport(false)} isLoading={exportLoading} className="gap-2">
                <DownloadIcon size={16} />
                <span>{t('settings.exportJson')}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExport(true)} isLoading={exportCsvLoading} className="gap-2">
                <DownloadIcon size={16} />
                <span>{t('settings.exportCsv')}</span>
              </Button>
            </div>
          }
        />
        <Row
          label={t('settings.importData')}
          help={bn ? 'এই অ্যাপ থেকে এক্সপোর্ট করা .json / .csv ফাইল সাপোর্ট করে।' : 'Supports .json / .csv files exported from this app.'}
          right={
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer hover:border-[var(--color-primary)]">
              <DownloadIcon size={16} />
              <span>{importLoading ? t('common.loading') : t('settings.importData')}</span>
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                disabled={importLoading}
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
            </label>
          }
        />
        <Row
          label={t('settings.wipeLogs')}
          help={bn ? 'Habit গুলো থাকবে, শুধু দৈনিক log মুছবে।' : 'Keeps habits, erases daily logs only.'}
          right={
            <Button variant="danger" size="sm" onClick={() => setIsWipeOpen(true)} className="gap-2">
              <TrashIcon size={16} />
              <span>{t('settings.wipeLogs')}</span>
            </Button>
          }
        />
      </Card>

      <Modal isOpen={isWipeOpen} onClose={() => setIsWipeOpen(false)} title={t('settings.wipeLogs')}>
        <div className="space-y-4">
          <Input placeholder="Type 'delete' to confirm" value={wipeText} onChange={(e) => setWipeText(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsWipeOpen(false)} disabled={wipeLoading}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleWipe} isLoading={wipeLoading} disabled={wipeText.toLowerCase() !== 'delete'}>
              {t('settings.wipeLogs')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- About
function AboutSection({
  t,
  onJumpToFeedback,
}: {
  t: (k: BnKeys) => string;
  onJumpToFeedback?: () => void;
}) {
  const { prefs } = usePrefs();
  const bn = prefs.language === 'bn';
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <Row label={t('settings.appVersion')} right={<span className="text-sm font-semibold tabular-nums">v{APP_VERSION}</span>} />
        <Row
          label={bn ? 'তৈরি করেছে' : 'Made by'}
          right={
            <a
              href={APP_SUPPORT.studioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                Z
              </span>
              <span>{APP_SUPPORT.studioName} ⎋</span>
            </a>
          }
        />
        <Row
          label={bn ? 'ফিডব্যাক' : 'Feedback'}
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onJumpToFeedback?.()}
              className="gap-1.5"
            >
              <WhatsAppIcon size={14} />
              {bn ? 'পাঠান' : 'Send'}
            </Button>
          }
        />
        <Row
          label={bn ? 'শর্তাবলী' : 'Terms'}
          right={
            <Button variant="secondary" size="sm" onClick={() => setTermsOpen(true)}>
              {bn ? 'পড়ুন' : 'Read'}
            </Button>
          }
        />
      </Card>

      <Modal isOpen={termsOpen} onClose={() => setTermsOpen(false)} title={bn ? 'শর্তাবলী' : 'Terms'}>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {bn
            ? 'আপনার ডেটা শুধু আপনার অ্যাকাউন্টে থাকে। পাসওয়ার্ড ও জন্ম তারিখ hash করে সংরক্ষণ করা হয়, কখনো plain text এ রাখা হয় না। AI কোচ আপনার habit ডেটা শুধু পরামর্শের জন্য ব্যবহার করে। অ্যাকাউন্ট ডিলিট করলে সব ডেটা স্থায়ীভাবে মুছে যায়।'
            : 'Your data stays in your account only. Passwords and birth dates are stored hashed, never in plain text. The AI coach uses your habit data only for advice. Deleting your account permanently erases all data.'}
        </p>
      </Modal>
    </div>
  );
}
