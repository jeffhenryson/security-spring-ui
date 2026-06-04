// Lista estática mantida em sync manual com GET /audit-logs/actions.
// Quando o backend adicionar novos EventType, adicionar a entrada correspondente aqui.
export const AUDIT_ACTION_COLORS: Record<string, string> = {
  USER_LOGGED_IN: 'bg-blue-950 text-blue-300',
  USER_LOGGED_OUT: 'bg-blue-950 text-blue-400',
  LOGIN_FAILED: 'bg-orange-950 text-orange-300',
  ACCOUNT_LOCKED: 'bg-red-950 text-red-300',
  TOKEN_THEFT_DETECTED: 'bg-red-950 text-red-200',
  DEV_ELEVATION_COMPLETED: 'bg-amber-950 text-amber-300',
  USER_SESSIONS_CLEARED: 'bg-orange-950 text-orange-300',
  USER_REGISTERED: 'bg-green-950 text-green-300',
  USER_CREATED: 'bg-green-950 text-green-300',
  USER_DELETED: 'bg-red-950 text-red-400',
  USER_UPDATED: 'bg-sky-950 text-sky-300',
  USER_ENABLED: 'bg-green-950 text-green-400',
  USER_DISABLED: 'bg-red-950 text-red-300',
  USER_ROLE_ASSIGNED: 'bg-violet-950 text-violet-300',
  USER_ROLE_REMOVED: 'bg-violet-950 text-violet-400',
  USER_PASSWORD_CHANGED: 'bg-yellow-950 text-yellow-300',
  USER_EMAIL_CHANGED: 'bg-yellow-950 text-yellow-300',
  USER_EMAIL_VERIFIED: 'bg-green-950 text-green-300',
  ROLE_CREATED: 'bg-violet-950 text-violet-300',
  ROLE_DELETED: 'bg-red-950 text-red-300',
  PERMISSION_CREATED: 'bg-emerald-950 text-emerald-300',
  PERMISSION_DELETED: 'bg-red-950 text-red-300',
  PERMISSION_ASSIGNED_TO_ROLE: 'bg-emerald-950 text-emerald-300',
  PERMISSION_REMOVED_FROM_ROLE: 'bg-emerald-950 text-emerald-400',
  TOTP_ENABLED: 'bg-teal-950 text-teal-300',
  TOTP_DISABLED: 'bg-teal-950 text-teal-400',
  TOTP_BACKUP_CODES_REGENERATED: 'bg-teal-950 text-teal-300',
  TOTP_REPLACED: 'bg-teal-950 text-teal-300',
  PASSWORD_RESET_REQUESTED: 'bg-yellow-950 text-yellow-300',
  PASSWORD_RESET_COMPLETED: 'bg-green-950 text-green-300',
  EMAIL_CHANGE_REQUESTED: 'bg-yellow-950 text-yellow-300',
  EMAIL_CHANGE_CONFIRMED: 'bg-green-950 text-green-300',
  OAUTH_GOOGLE_LOGIN: 'bg-blue-950 text-blue-300',
  ACCESS_DENIED: 'bg-orange-950 text-orange-300',
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
  return AUDIT_ACTION_COLORS[action] ?? 'bg-[var(--surface-hover)] text-[var(--text-primary)]';
}
