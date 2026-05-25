const syncLogs = [];

function addLog(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type };
  syncLogs.push(logEntry);
  if (syncLogs.length > 500) syncLogs.shift();
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function getLogs() {
  return syncLogs;
}

module.exports = {
  addLog,
  getLogs
};
