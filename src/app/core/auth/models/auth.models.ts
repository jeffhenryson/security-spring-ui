export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface TwoFactorChallengeResponse {
  status: 'PENDING_2FA';
  challengeToken: string;
  expiresInSeconds: number;
}

export type LoginResponse = TokenPairResponse | TwoFactorChallengeResponse;

export function isTwoFactorChallenge(r: LoginResponse): r is TwoFactorChallengeResponse {
  return 'challengeToken' in r;
}

export interface CurrentUser {
  id: number;
  username: string;
  enabled: boolean;
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  roles: string[];
  permissions: string[];
}

export interface SessionInfo {
  id: number;
  createdAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
}

export interface TotpConfirmResponse {
  backupCodes: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TotpVerifyRequest {
  challengeToken: string;
  code: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface TotpConfirmRequest {
  code: string;
}

export interface TotpDisableRequest {
  currentPassword: string;
  code: string;
}
