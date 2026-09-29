'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestReset, verifyResetBirthDate, submitNewPassword } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, lang } = usePrefs();
  const bn = lang === 'bn';

  // Step 1: Submit username
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await requestReset(username.trim());
      // Always advance to step 2 to avoid user enumeration
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit birth date
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError('Please select your birth date');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await verifyResetBirthDate(username.trim(), birthDate);
      if (!res.success) {
        setError(res.error);
      } else {
        setResetToken(res.data.resetToken);
        setStep(3);
      }
    } catch {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Submit new password
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!resetToken) {
      setError('Reset session expired. Please start over.');
      setStep(1);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await submitNewPassword(resetToken, newPassword);
      if (!res.success) {
        setError(res.error);
      } else {
        toast('Password reset successful! Please log in.', 'success');
        router.push('/login');
      }
    } catch {
      setError('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            H
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            {bn ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {step === 1 && (bn ? 'শুরু করতে ইউজারনেম দিন' : 'Enter your username to begin')}
            {step === 2 && (bn ? 'জন্ম তারিখ দিয়ে পরিচয় নিশ্চিত করুন' : 'Verify your birth date to confirm identity')}
            {step === 3 && (bn ? 'শক্তিশালী নতুন পাসওয়ার্ড বেছে নিন' : 'Choose a strong new password')}
          </p>
        </div>

        <Card padding="lg">
          {error && (
            <div
              role="alert"
              className="p-3 mb-4 text-sm rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] font-medium"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <Input
                label={t('auth.username')}
                type="text"
                placeholder="Enter your registered username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                {bn ? 'এগিয়ে যান' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="p-3 text-xs rounded bg-[var(--color-missed)]/30 text-[var(--color-text-secondary)]">
                Account: <span className="font-semibold text-[var(--color-text-primary)]">{username}</span>
              </div>
              <Input
                label={t('settings.birthDate')}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={isLoading}
                required
                helperText="Must match the birth date registered with your account"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-1/3"
                >
                  {bn ? 'পেছনে' : 'Back'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-2/3"
                  isLoading={isLoading}
                >
                  {bn ? 'যাচাই করুন' : 'Verify Date'}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <Input
                label={t('settings.newPassword')}
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Input
                label={t('settings.confirmPassword')}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                {bn ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
            {bn ? 'মনে পড়েছে?' : 'Remember your credentials?'}{' '}
            <Link
              href="/login"
              className="text-[var(--color-primary)] font-semibold hover:underline"
            >
              {t('auth.signin')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
