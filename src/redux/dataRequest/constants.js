/** @type {Readonly<Record<string, import('./types').ReExportStatus>>} */
export const RE_EXPORT_STATUS = Object.freeze({
  DISPATCHING: 'DISPATCHING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN',
});

const RE_EXPORT_STATUS_ALIASES = Object.freeze({
  dispatching: RE_EXPORT_STATUS.DISPATCHING,
  queued: RE_EXPORT_STATUS.RUNNING,
  pending: RE_EXPORT_STATUS.RUNNING,
  running: RE_EXPORT_STATUS.RUNNING,
  inprogress: RE_EXPORT_STATUS.RUNNING,
  complete: RE_EXPORT_STATUS.COMPLETED,
  completed: RE_EXPORT_STATUS.COMPLETED,
  success: RE_EXPORT_STATUS.COMPLETED,
  succeeded: RE_EXPORT_STATUS.COMPLETED,
  failed: RE_EXPORT_STATUS.FAILED,
  failure: RE_EXPORT_STATUS.FAILED,
  error: RE_EXPORT_STATUS.FAILED,
  canceled: RE_EXPORT_STATUS.FAILED,
  cancelled: RE_EXPORT_STATUS.FAILED,
});

/**
 * @param {unknown} status
 * @returns {import('./types').ReExportStatus}
 */
export function normalizeReExportStatus(status) {
  const normalizedStatus = String(status ?? '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  return RE_EXPORT_STATUS_ALIASES[normalizedStatus] ?? RE_EXPORT_STATUS.UNKNOWN;
}

/** @param {import('./types').ReExportStatus} status */
export function isTerminalReExportStatus(status) {
  return (
    status === RE_EXPORT_STATUS.COMPLETED || status === RE_EXPORT_STATUS.FAILED
  );
}
