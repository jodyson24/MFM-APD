const { delByPrefix } = require('./cache');
const { getIo } = require('../services/socketService');

// Resource names double as cache namespaces AND socket event resources.
// e.g. 'activities', 'orgunits', 'cycles', 'compliance', 'weekly-metrics',
// 'analytics', 'users', 'lookups'.

function notifyChange(resource, payload = {}) {
  delByPrefix(resource).catch(() => {});
  const io = getIo();
  if (io) {
    io.emit('data:changed', {
      resource,
      at: new Date().toISOString(),
      ...payload,
    });
  }
}

// A single mutation usually touches several cached views.
function notifyResources(resources, payload = {}) {
  for (const resource of resources) {
    notifyChange(resource, payload);
  }
}

module.exports = { notifyChange, notifyResources };
