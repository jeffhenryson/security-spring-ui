export type { LoginRequest } from '../../../api/models/login-request';
export type { TokenPairResponse } from '../../../api/models/token-pair-response';
export type { TwoFactorChallengeResponse } from '../../../api/models/two-factor-challenge-response';
export type { TotpVerifyRequest } from '../../../api/models/totp-verify-request';
export type { LogoutRequest } from '../../../api/models/logout-request';
export type { RegisterRequest } from '../../../api/models/register-request';
export type { ForgotPasswordRequest } from '../../../api/models/forgot-password-request';
export type { ResetPasswordRequest } from '../../../api/models/reset-password-request';
export type { TotpConfirmRequest } from '../../../api/models/totp-confirm-request';
export type { TotpDisableRequest } from '../../../api/models/totp-disable-request';
export type { SessionInfo } from '../../../api/models/session-info';
export type { TotpSetupResponse } from '../../../api/models/totp-setup-response';
export type { TotpConfirmResponse } from '../../../api/models/totp-confirm-response';
export type { UserResponse } from '../../../api/models/user-response';

import type { TokenPairResponse } from '../../../api/models/token-pair-response';
import type { TwoFactorChallengeResponse } from '../../../api/models/two-factor-challenge-response';
import type { UserResponse } from '../../../api/models/user-response';

/** User currently logged in — extends UserResponse with TOTP flag not returned by the API */
export interface CurrentUser extends UserResponse {
  totpEnabled?: boolean;
}

export type LoginResponse = TokenPairResponse | TwoFactorChallengeResponse;

export function isTwoFactorChallenge(r: LoginResponse): r is TwoFactorChallengeResponse {
  return 'challengeToken' in r;
}
