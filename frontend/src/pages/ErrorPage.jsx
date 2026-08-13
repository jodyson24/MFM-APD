import React from 'react';
import { Link } from 'react-router-dom';

export function ErrorPage({
  code = '404',
  title = 'Page not found',
  message = 'The page you requested could not be found.',
  primaryLabel = 'Back home',
  primaryTo = '/',
  secondaryLabel,
  secondaryTo,
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl text-center">
        <div className="text-6xl font-black text-cyan-400 mb-4">{code}</div>
        <h1 className="text-3xl font-bold mb-3">{title}</h1>
        <p className="text-slate-300 mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to={primaryTo}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {primaryLabel}
          </Link>

          {secondaryLabel && secondaryTo && (
            <Link
              to={secondaryTo}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      message="The page you requested does not exist or may have been moved."
      primaryLabel="Return home"
      primaryTo="/"
      secondaryLabel="Go to login"
      secondaryTo="/login"
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      message="You do not have permission to view this page. Please sign in with the correct account or contact an administrator."
      primaryLabel="Go to login"
      primaryTo="/login"
      secondaryLabel="Back home"
      secondaryTo="/"
    />
  );
}

export function UnauthorizedPage() {
  return (
    <ErrorPage
      code="401"
      title="Authentication required"
      message="Your session is missing or has expired. Please sign in to continue."
      primaryLabel="Sign in"
      primaryTo="/login"
      secondaryLabel="Back home"
      secondaryTo="/"
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Something went wrong"
      message="The app hit an unexpected error. Please try again or return home."
      primaryLabel="Refresh page"
      primaryTo="/"
      secondaryLabel="Go home"
      secondaryTo="/"
    />
  );
}

export default ErrorPage;
