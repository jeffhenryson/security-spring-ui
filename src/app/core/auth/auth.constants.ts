export const REFRESH_TOKEN_KEY = 'ss_refresh_token';
// Presente em localStorage quando o backend usa HttpOnly cookie para o refresh token.
// Indica que uma sessão existe mesmo que REFRESH_TOKEN_KEY esteja ausente.
export const SESSION_MARKER_KEY = 'ss_session';
