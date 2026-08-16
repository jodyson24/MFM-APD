const getLatestEvaluationDate = (summaryItem = {}) => {
  const candidates = [
    ...(summaryItem.details || []).map(
      (detail) => detail.lastEvaluatedAt || detail.updatedAt || detail.createdAt
    ),
    summaryItem.lastEvaluatedAt,
  ].filter(Boolean);

  if (candidates.length === 0) return null;

  const times = candidates
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (times.length === 0) return null;

  return new Date(Math.max(...times));
};

const getVisibleShortfalls = (summary = [], maxItems = 4) => {
  const ordered = [...summary]
    .filter((item) => (item.shortfalls || 0) > 0)
    .sort((a, b) => {
      const aDate = getLatestEvaluationDate(a)?.getTime?.() ?? 0;
      const bDate = getLatestEvaluationDate(b)?.getTime?.() ?? 0;
      return bDate - aDate;
    });

  return ordered.slice(0, maxItems);
};

module.exports = {
  getLatestEvaluationDate,
  getVisibleShortfalls,
};
