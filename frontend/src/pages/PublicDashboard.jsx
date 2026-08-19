import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Countdown from '../components/common/countdown.jsx';
import { Logo } from '../components/ui/index.js';
import { useAuth } from '../context/index.js';
import { PWAInstallPrompt } from '../components/common/PWAInstallPrompt.jsx';
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  HomeModernIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const TYPE_ICON = { mega_region: 'Mega', region: 'Region', zone: 'Zone', branch: 'Branch' };
const TYPE_BADGE = {
  mega_region: 'bg-brand-100 text-brand-700',
  region: 'bg-blue-100 text-blue-700',
  zone: 'bg-amber-100 text-amber-700',
  branch: 'bg-emerald-100 text-emerald-700',
};

const countProgrammes = (node) =>
  node.programmes.length + (node.children || []).reduce((sum, c) => sum + countProgrammes(c), 0);

const TypeBadge = ({ type }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
      TYPE_BADGE[type] || 'bg-ink-100 text-ink-600'
    }`}
  >
    {TYPE_ICON[type] || type}
  </span>
);

const ProgrammeList = ({ programmes }) => (
  <ul className="mt-3 space-y-1.5">
    {programmes.map((p) => (
      <li key={p.id} className="flex items-center gap-2.5 rounded-md py-0.5 text-sm text-ink-700">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
        <span className="truncate">{p.title}</span>
        <span className="ml-auto shrink-0 text-xs text-ink-400">
          {new Date(p.scheduledDate).toLocaleDateString()}
        </span>
      </li>
    ))}
  </ul>
);

const TreeCard = ({ node, depth = 0 }) => {
  const total = countProgrammes(node);
  const isRoot = depth === 0;
  const hasChildren = node.children && node.children.length > 0;
  const hasContent = node.programmes.length > 0 || hasChildren;
  const [expanded, setExpanded] = useState(depth === 0);

  // Roots are solid white cards; deeper levels are soft flat panels so the
  // hierarchy reads as nested groups rather than "cards inside cards".
  const containerCls = isRoot
    ? 'card p-5 sm:p-6'
    : 'rounded-xl bg-ink-50/70 p-4 ring-1 ring-ink-100';

  return (
    <div className={containerCls}>
      <button
        type="button"
        onClick={() => hasContent && setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-2.5 text-left ${
          hasContent ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <TypeBadge type={node.type} />
        {node.isHeadquarters && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            HQ
          </span>
        )}
        <span
          className={`min-w-0 flex-1 truncate font-semibold text-ink-900 ${
            isRoot ? 'text-lg' : 'text-sm'
          }`}
          title={node.name}
        >
          {node.name}
        </span>
        {total > 0 && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
            {total} programme{total !== 1 ? 's' : ''}
          </span>
        )}
        {hasContent && (
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {expanded && (
        <div className="animate-in">
          {node.location && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-400">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
              {node.location}
            </p>
          )}
          {node.programmes.length > 0 && <ProgrammeList programmes={node.programmes} />}

          {hasChildren && (
            <div
              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                isRoot ? 'mt-5 border-t border-ink-100 pt-5' : 'mt-4 border-t border-ink-100/80 pt-4'
              }`}
            >
              {node.children.map((c) => (
                <TreeCard key={c.id} node={c} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PublicDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tree, setTree] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/public/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load the public dashboard.'));
    api
      .get('/public/tree')
      .then((res) => setTree(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bodyBg">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 pb-16 pt-8 text-white sm:pb-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Logo />
            <Link
              to={user ? '/admin' : '/login'}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>{user ? 'Back to Portal' : 'Login'}</span>
            </Link>
          </div>

          <div className="mt-12 max-w-2xl sm:mt-16">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200 ring-1 ring-white/15">
              <CalendarDaysIcon className="h-4 w-4 text-amber-300" />
              Public programme calendar
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              MFM Activities <span className="text-amber-400">Dashboard</span>
            </h1>
            <p className="mt-4 max-w-lg text-brand-200">
              Dates &amp; names only &mdash; a transparency view of the programmes scheduled across
              our regions, zones, and branches.
            </p>
            {data?.headquarters && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/15">
                <HomeModernIcon className="h-4 w-4 text-amber-300" />
                Serving <span className="text-amber-300">{data.headquarters.name}</span>
                {data.headquarters.location ? ` — ${data.headquarters.location}` : ''}
                <span className="text-brand-300">· Headquarters</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-20 sm:px-6">
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" />
            {error}
          </div>
        )}

        {/* Next presentation */}
        {data?.nextPresentationDate && (
          <section className="card p-5 mt-5 shadow-elevated sm:p-7">
            <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                  Next Bi-Annual Presentation
                  {data.nextPresentationLabel ? ` &middot; ${data.nextPresentationLabel}` : ''}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                  Countdown to the big day
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {new Date(data.nextPresentationDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Countdown targetDate={data.nextPresentationDate} />
            </div>
          </section>
        )}

        {/* Mega Regional Programmes */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink-900">Mega Regional Programmes</h2>
            <p className="text-sm text-ink-500">Programmes scheduled by each mega region.</p>
          </div>
          {data?.programmes?.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.programmes.map((mr) => (
                <div key={mr.id} className="card card-hover p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-ink-900">{mr.name}</h3>
                        {mr.isHeadquarters && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            HQ
                          </span>
                        )}
                      </div>
                      {mr.location && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-400">
                          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                          {mr.location}
                        </p>
                      )}
                    </div>
                    {mr.programmes.length > 0 && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                        {mr.programmes.length}
                      </span>
                    )}
                  </div>
                  {mr.programmes.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-400">No programmes scheduled yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {mr.programmes.map((p) => (
                        <li key={p.id} className="flex items-start gap-2 text-sm">
                          <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink-700">{p.title}</span>
                            <span className="block text-xs text-ink-400">
                              {new Date(p.scheduledDate).toLocaleDateString()}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <div className="card p-8 text-center text-sm text-ink-500">
                No mega regional programmes scheduled yet.
              </div>
            )
          )}
        </section>

        {/* Full calendar — card system (regions → zones → branches) */}
        {tree.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink-900">
                Full Calendar <span className="font-normal text-ink-400">(Regions &rarr; Zones &rarr; Branches)</span>
              </h2>
              <p className="text-sm text-ink-500">
                Click any region, zone, or branch to expand it and reveal its programmes and
                sub-groups.
              </p>
            </div>
            <div
              className={`grid grid-cols-1 items-start gap-6 ${
                tree.length > 1 ? 'lg:grid-cols-2' : ''
              }`}
            >
              {tree.map((n) => (
                <TreeCard key={n.id} node={n} />
              ))}
            </div>
          </section>
        )}

        <PWAInstallPrompt />

        <footer className="border-t border-ink-200 pt-6 text-center">
          <p className="text-xs text-ink-400">
            &copy; {new Date().getFullYear()} MFM Activities &amp; Performance Dashboard &middot;
            Dates shown are subject to change.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PublicDashboard;
