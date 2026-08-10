import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../utils/validators.js';
import { useAuth } from '../context/index.js';
import {
  Logo,
  Button,
} from '../components/ui/index.js';
import {
  EnvelopeIcon,
  LockClosedIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const FEATURES = [
  { icon: CalendarDaysIcon, title: 'Activity Tracking', text: 'Schedule and report ministry activities across every tier.' },
  { icon: ShieldCheckIcon, title: 'Compliance Checks', text: 'Automated shortfall alerts against your targets.' },
  { icon: ChartBarIcon, title: 'Performance Analytics', text: 'Roll up results into bi-annual presentations.' },
];

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to="/admin" replace />;

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      navigate('/admin');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-bodyBg">
      {/* Brand panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

        <Logo />

        <div className="relative space-y-8">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Activities &amp; Performance, <span className="text-amber-400">in one dashboard</span>.
          </h1>
          <p className="max-w-md text-brand-200">
            Track schedules, verify follow-ups, and measure growth across Mega Regions, Regions,
            Zones, and Branches — all the way to the bi-annual presentation.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-brand-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-400">
          © {new Date().getFullYear()} MFM · Private &amp; Confidential
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo variant="dark" />
          </div>

          <div className="card p-8 shadow-elevated">
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h2>
              <p className="mt-1 text-sm text-ink-500">Sign in to your dashboard account.</p>
            </div>

            {serverError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="field-label">Email</label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={`input pl-11 ${errors.email ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <div className="relative">
                  <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`input pl-11 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full py-3">
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            Forgot your password? Contact your administrator to reset it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
