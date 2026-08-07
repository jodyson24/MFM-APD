const cron = require('node-cron');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const MetricsRollup = require('../models/MetricsRollup');
const PresentationCycle = require('../models/PresentationCycle');
const logger = require('../utils/logger');

/**
 * Aggregate activity metrics (attendance, soulsWon, etc.) per orgUnit, activityType, division, and period.
 * We compute for each completed activity within a period, and sum the metrics.
 */
async function runMetricsRollup() {
  logger.info('Starting metrics rollup...');
  try {
    // Find all presentation cycles
    const cycles = await PresentationCycle.find().lean();
    if (cycles.length === 0) {
      logger.warn('No presentation cycles found, skipping rollup');
      return;
    }

    // For each cycle, compute rollup for all org units, activity types, divisions
    // We'll do a single aggregation per cycle
    for (const cycle of cycles) {
      const { label, periodStart, periodEnd } = cycle;

      // Aggregation pipeline
      const pipeline = [
        {
          $match: {
            status: 'completed',
            'report.submittedAt': { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $unwind: {
            path: '$divisions',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              orgUnitId: '$orgUnitId',
              activityTypeId: '$activityTypeId',
              divisionId: { $ifNull: ['$divisions', null] },
            },
            // Sum up metrics; we need to know which metrics exist – we'll use dynamic keys
            // For simplicity, we'll collect all numeric fields from metrics
            // We'll use $mergeObjects to combine all metrics objects and then sum
            // But easier: since metrics shape varies, we'll store as a dictionary of sums.
            // We'll use $addToSet to gather all metric keys, but better: we'll define known keys.
            // Known keys: attendance, soulsWon, newConverts, deliverancesRecorded, testimoniesCount,
            // participants, peopleReached, tractsDistributed, beneficiariesReached, itemsDistributed.
            // We'll sum each if present.
            attendance: { $sum: { $ifNull: ['$report.metrics.attendance', 0] } },
            soulsWon: { $sum: { $ifNull: ['$report.metrics.soulsWon', 0] } },
            newConverts: { $sum: { $ifNull: ['$report.metrics.newConverts', 0] } },
            deliverancesRecorded: { $sum: { $ifNull: ['$report.metrics.deliverancesRecorded', 0] } },
            testimoniesCount: { $sum: { $ifNull: ['$report.metrics.testimoniesCount', 0] } },
            participants: { $sum: { $ifNull: ['$report.metrics.participants', 0] } },
            peopleReached: { $sum: { $ifNull: ['$report.metrics.peopleReached', 0] } },
            tractsDistributed: { $sum: { $ifNull: ['$report.metrics.tractsDistributed', 0] } },
            beneficiariesReached: { $sum: { $ifNull: ['$report.metrics.beneficiariesReached', 0] } },
            itemsDistributed: { $sum: { $ifNull: ['$report.metrics.itemsDistributed', 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            orgUnitId: '$_id.orgUnitId',
            activityTypeId: '$_id.activityTypeId',
            divisionId: '$_id.divisionId',
            periodLabel: label,
            metrics: {
              attendance: '$attendance',
              soulsWon: '$soulsWon',
              newConverts: '$newConverts',
              deliverancesRecorded: '$deliverancesRecorded',
              testimoniesCount: '$testimoniesCount',
              participants: '$participants',
              peopleReached: '$peopleReached',
              tractsDistributed: '$tractsDistributed',
              beneficiariesReached: '$beneficiariesReached',
              itemsDistributed: '$itemsDistributed',
            },
          },
        },
      ];

      const results = await Activity.aggregate(pipeline);

      // Upsert rollup documents
      for (const result of results) {
        const { orgUnitId, activityTypeId, divisionId, periodLabel, metrics } = result;
        // For each metric key, create a separate document (or store as embedded object)
        // We'll store each metric as separate documents for easier querying
        for (const [key, value] of Object.entries(metrics)) {
          if (value > 0) {
            await MetricsRollup.findOneAndUpdate(
              {
                orgUnitId,
                activityTypeId,
                divisionId: divisionId || null,
                periodLabel,
                metricKey: key,
              },
              {
                orgUnitId,
                activityTypeId,
                divisionId: divisionId || null,
                periodLabel,
                metricKey: key,
                metricValue: value,
              },
              { upsert: true, new: true }
            );
          }
        }
      }
    }

    logger.info('Metrics rollup completed.');
  } catch (error) {
    logger.error(`Metrics rollup failed: ${error.message}`);
  }
}

// Schedule: run daily at 3:00 AM (after compliance check)
cron.schedule('0 3 * * *', () => {
  logger.info('Running scheduled metrics rollup');
  runMetricsRollup();
});

module.exports = { runMetricsRollup };