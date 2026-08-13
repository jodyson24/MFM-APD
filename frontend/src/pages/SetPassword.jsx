import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setPasswordSchema } from '../utils/validators.js';
import { useAuth } from '../context/index.js';
import { Logo, Button } from '../components/ui/index.js';
import { KeyIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const SetPassword = () => {
  const { setPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await setPassword(data.token, data.password, data.confirmPassword);
      setDone(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Could not set password. The link may be invalid or expired.');
    }
  };

  const Shell = ({ children }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );

  if (done) {
    return (
      <Shell>
        <div className="card p-8 text-center shadow-elevated">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Password set successfully</h1>
          <p className="mt-2 text-sm text-ink-500">You can now sign in with your new password.</p>
          <Link to="/login" className="mt-6 inline-flex w-full">
            <Button className="w-full py-3">Go to Sign In</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="card p-8 shadow-elevated">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100">
            <KeyIcon className="h-7 w-7 text-brand-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Set Your Password</h1>
          <p className="mt-1 text-sm text-ink-500">
            Choose a strong password for your account.
          </p>
        </div>

        {serverError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Minimum 10 characters, incl. a number and a symbol"
            />
            {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="field-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting || !token} className="w-full py-3">
            {isSubmitting ? 'Setting password…' : 'Set Password'}
          </Button>
        </form>
      </div>
    </Shell>
  );
};

export default SetPassword;
