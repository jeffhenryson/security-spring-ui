// Mantido apenas para limpar tokens legados de sessões anteriores ao modo HttpOnly cookie.
export const REFRESH_TOKEN_KEY = 'ss_refresh_token';
// Marcador de sessão ativa — presente quando o refresh token trafega via HttpOnly cookie.
export const SESSION_MARKER_KEY = 'ss_session';
// DEV token persistido em sessionStorage (some ao fechar a aba — mais seguro que localStorage para token privilegiado).
export const DEV_TOKEN_KEY = 'ss_dev_token';
export const DEV_TOKEN_EXPIRES_KEY = 'ss_dev_expires';
