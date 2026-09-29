'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signup } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = usePrefs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password || !confirmPassword || !birthDate) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        username: username.trim(),
        password,
        birthDate,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        toast(`Account created! Welcome, ${res.data.username}`, 'success');
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('An error occurred during account creation');
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
            {t('auth.signupTitle')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('auth.signupSub')}
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 text-sm rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] font-medium"
              >
                {error}
              </div>
            )}

            <Input
              label={t('auth.username')}
              type="text"
              autoComplete="username"
              placeholder="e.g. carno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
              helperText="Only letters, numbers, dashes and underscores"
            />

            <Input
              label={t('settings.birthDate')}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={isLoading}
              required
              helperText="Used securely for password reset verification"
            />

            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label={t('settings.confirmPassword')}
              type="password"
              autoComplete="new-password"
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
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {t('auth.signup')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
            {t('auth.hasAccount')}{' '}
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
