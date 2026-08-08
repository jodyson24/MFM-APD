import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setPasswordSchema } from '../utils/validators';
import { useAuth } from '../context';

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
      await setPassword(data.token, data.password);
      setDone(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Could not set password. The link may be invalid or expired.');
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-gradient px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-primaryBg">Password set successfully</h1>
          <p className="text-sm text-gray-500 mt-2">You can now sign in with your new password.</p>
          <Link
            to="/login"
            className="mt-6 inline-block px-6 py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-gradient px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primaryBg">Set Your Password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account</p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              {...register('password')}
              className={`w-full rounded-md border shadow-sm px-3 py-2 ${
                errors.password ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Minimum 10 characters, incl. a number and a symbol"
            />
            {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              {...register('confirmPassword')}
              className={`w-full rounded-md border shadow-sm px-3 py-2 ${
                errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? 'Setting password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
