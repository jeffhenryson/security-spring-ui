// Lista estática mantida em sync manual com GET /audit-logs/actions.
// Quando o backend adicionar novos EventType, adicionar a entrada correspondente aqui.
export const AUDIT_ACTION_COLORS: Record<string, string> = {
  USER_LOGGED_IN: 'cs-badge cs-badge--info',
  USER_LOGGED_OUT: 'cs-badge cs-badge--info',
  LOGIN_FAILED: 'cs-badge cs-badge--warning',
  ACCOUNT_LOCKED: 'cs-badge cs-badge--danger',
  TOKEN_THEFT_DETECTED: 'cs-badge cs-badge--danger',
  DEV_ELEVATION_COMPLETED: 'cs-badge cs-badge--warning',
  USER_SESSIONS_CLEARED: 'cs-badge cs-badge--warning',
  USER_REGISTERED: 'cs-badge cs-badge--success',
  USER_CREATED: 'cs-badge cs-badge--success',
  USER_DELETED: 'cs-badge cs-badge--danger',
  USER_UPDATED: 'cs-badge cs-badge--info',
  USER_ENABLED: 'cs-badge cs-badge--success',
  USER_DISABLED: 'cs-badge cs-badge--danger',
  USER_ROLE_ASSIGNED: 'cs-badge cs-badge--info',
  USER_ROLE_REMOVED: 'cs-badge cs-badge--warning',
  USER_PASSWORD_CHANGED: 'cs-badge cs-badge--warning',
  USER_EMAIL_CHANGED: 'cs-badge cs-badge--warning',
  USER_EMAIL_VERIFIED: 'cs-badge cs-badge--success',
  ROLE_CREATED: 'cs-badge cs-badge--info',
  ROLE_DELETED: 'cs-badge cs-badge--danger',
  PERMISSION_CREATED: 'cs-badge cs-badge--success',
  PERMISSION_DELETED: 'cs-badge cs-badge--danger',
  PERMISSION_ASSIGNED_TO_ROLE: 'cs-badge cs-badge--success',
  PERMISSION_REMOVED_FROM_ROLE: 'cs-badge cs-badge--warning',
  TOTP_ENABLED: 'cs-badge cs-badge--success',
  TOTP_DISABLED: 'cs-badge cs-badge--warning',
  TOTP_BACKUP_CODES_REGENERATED: 'cs-badge cs-badge--success',
  TOTP_REPLACED: 'cs-badge cs-badge--success',
  PASSWORD_RESET_REQUESTED: 'cs-badge cs-badge--warning',
  PASSWORD_RESET_COMPLETED: 'cs-badge cs-badge--success',
  EMAIL_CHANGE_REQUESTED: 'cs-badge cs-badge--warning',
  EMAIL_CHANGE_CONFIRMED: 'cs-badge cs-badge--success',
  OAUTH_GOOGLE_LOGIN: 'cs-badge cs-badge--info',
  ACCESS_DENIED: 'cs-badge cs-badge--warning',
};

/** Eventos que indicam incidentes de segurança — exibidos com badge de alerta no dev-logs. */
export const AUDIT_CRITICAL_EVENTS = new Set([
  'TOKEN_THEFT_DETECTED',
  'ACCOUNT_LOCKED',
  'LOGIN_FAILED',
  'DEV_ELEVATION_COMPLETED',
]);

/** Eventos exclusivos da área DEV — filtrados da view ADMIN.
 *  LOGIN_FAILED, ACCOUNT_LOCKED e TOKEN_THEFT_DETECTED são visíveis a admins
 *  porque indicam ataques ativos — o admin precisa monitorar esses eventos.
 */
export const AUDIT_DEV_ONLY_EVENTS = new Set([
  'DEV_ELEVATION_COMPLETED',
]);

export function auditBadgeClass(action: string): string {
  return AUDIT_ACTION_COLORS[action] ?? 'cs-badge cs-badge--default';
}
