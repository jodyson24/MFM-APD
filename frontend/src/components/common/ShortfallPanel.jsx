import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import { getVisibleShortfalls } from '../../utils/complianceSummary.js';
import { Modal } from '../ui/index.js';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const ShortfallPanel = () => {
  const [shortfalls, setShortfalls] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/compliance/status')
      .then((res) => {
        const summary = res.data.summary || [];
        setShortfalls(summary.filter((s) => s.shortfalls > 0));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const sortedShortfalls = useMemo(
    () => getVisibleShortfalls(shortfalls, shortfalls.length || 4),
    [shortfalls]
  );
  const visibleShortfalls = sortedShortfalls.slice(0, 4);
  const hiddenCount = Math.max(shortfalls.length - visibleShortfalls.length, 0);

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!loaded) {
    return <p className="text-sm text-ink-400">Checking compliance…</p>;
  }

  if (shortfalls.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
        <CheckCircleIcon className="h-5 w-5" />
        All compliant
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {visibleShortfalls.map((item) => (
          <button
            key={item.orgUnit._id}
            type="button"
            onClick={() => setSelectedItem(item)}
            className="flex w-full items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-left ring-1 ring-red-100 transition hover:bg-red-100"
          >
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-red-800">
              {item.orgUnit?.name || 'Unknown unit'}
            </span>
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
              {item.shortfalls}
            </span>
          </button>
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View more
            <ArrowRightIcon className="h-3.5 w-3.5" />
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700">
              +{hiddenCount}
            </span>
          </button>
        )}
      </div>

      <Modal
        open={showAllModal}
        onClose={() => setShowAllModal(false)}
        title="All compliance shortfalls"
        subtitle="Review outstanding items by unit"
        icon={ExclamationTriangleIcon}
        size="lg"
      >
        <div className="space-y-2">
          {sortedShortfalls.map((item) => (
            <button
              key={item.orgUnit._id}
              type="button"
              onClick={() => {
                setSelectedItem(item);
                setShowAllModal(false);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-left transition hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                {item.orgUnit?.name || 'Unknown unit'}
              </span>
              <span className="ml-3 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                {item.shortfalls}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Compliance details"
        subtitle={selectedItem?.orgUnit?.name || 'Shortfall summary'}
        icon={ExclamationTriangleIcon}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Shortfalls</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{selectedItem.shortfalls}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Total checks</p>
                <p className="mt-2 text-2xl font-bold text-ink-800">{selectedItem.total}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Last review</p>
                <p className="mt-2 text-sm font-semibold text-brand-700">
                  {formatDate(
                    selectedItem.details?.[0]?.lastEvaluatedAt ||
                      selectedItem.details?.[0]?.updatedAt ||
                      selectedItem.lastEvaluatedAt
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedItem.details?.filter((detail) => detail.status === 'shortfall').map((detail) => (
                <div key={`${detail._id || detail.periodLabel || detail.activityCategoryId?._id || 'detail'}-${detail.lastEvaluatedAt}`} className="rounded-xl border border-ink-100 bg-ink-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {detail.activityCategoryId?.name || 'Compliance category'}
                      </p>
                      <p className="text-xs text-ink-500">
                        {detail.periodLabel || 'Current period'}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                      {detail.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-ink-600 sm:grid-cols-3">
                    <div>
                      <p className="font-semibold text-ink-500">Required</p>
                      <p>{detail.requiredCount ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-500">Actual</p>
                      <p>{detail.actualCount ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-500">Reviewed</p>
                      <p>{formatDate(detail.lastEvaluatedAt)}</p>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="rounded-xl border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500">
                  No detailed shortfalls are available for this unit.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarDaysIcon className="h-4 w-4" />
                Review note
              </div>
              <p className="mt-2 leading-5">
                This summary reflects the most recent compliance review for the selected unit and highlights the records still below the required threshold.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ShortfallPanel;
