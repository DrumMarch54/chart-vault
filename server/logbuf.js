// Keeps the last few hundred log lines in memory for /api/debug/snapshot.
const MAX = 300;
const lines = [];
export function remember(line) { lines.push(line); if (lines.length > MAX) lines.shift(); }
export function recentLogs(n = MAX) { return lines.slice(-n); }
