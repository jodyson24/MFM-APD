const test = require('node:test');
const assert = require('node:assert/strict');
const { getVisibleShortfalls } = require('../lib/complianceSummary.js');

test('sorts shortfalls by newest status first and caps visible items to four', () => {
  const summary = [
    {
      orgUnit: { name: 'Oldest', _id: '1' },
      shortfalls: 2,
      details: [{ lastEvaluatedAt: '2024-01-01T00:00:00.000Z' }],
    },
    {
      orgUnit: { name: 'Newest', _id: '2' },
      shortfalls: 5,
      details: [{ lastEvaluatedAt: '2025-06-15T00:00:00.000Z' }],
    },
    {
      orgUnit: { name: 'Mid', _id: '3' },
      shortfalls: 1,
      details: [{ lastEvaluatedAt: '2024-12-01T00:00:00.000Z' }],
    },
    {
      orgUnit: { name: 'Fourth', _id: '4' },
      shortfalls: 3,
      details: [{ lastEvaluatedAt: '2025-01-10T00:00:00.000Z' }],
    },
    {
      orgUnit: { name: 'Fifth', _id: '5' },
      shortfalls: 4,
      details: [{ lastEvaluatedAt: '2025-02-10T00:00:00.000Z' }],
    },
  ];

  const visible = getVisibleShortfalls(summary, 4);

  assert.deepEqual(
    visible.map((item) => item.orgUnit.name),
    ['Newest', 'Fifth', 'Fourth', 'Mid']
  );
  assert.equal(visible.length, 4);
});
