import { Page } from '@playwright/test';

const API = 'http://localhost:8080';

export const MOCK_ACCESS_TOKEN = 'mock-access-token';

export const MOCK_USER = {
  id: 1,
  username: 'admin',
  enabled: true,
  email: 'admin@example.com',
  emailVerified: true,
  pendingEmail: null,
  totpEnabled: false,
  roles: ['ADMIN'],
  permissions: [
    'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_STATUS', 'USER_ROLE_ASSIGN',
    'ROLE_READ', 'ROLE_CREATE', 'ROLE_DELETE', 'ROLE_MANAGE_PERMISSIONS',
    'PERMISSION_READ', 'PERMISSION_CREATE', 'PERMISSION_DELETE',
    'AUDIT_READ',
  ],
};

export const MOCK_TOKEN_PAIR = {
  accessToken: MOCK_ACCESS_TOKEN,
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
};

// ── login via formulário ───────────────────────────────────────────────────

export async function mockLogin(page: Page): Promise<void> {
  await page.route(`${API}/auth/login`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOKEN_PAIR) }),
  );
  await page.route(`${API}/users/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) }),
  );
  await page.route(`${API}/auth/2fa/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, backupCodesRemaining: 0 }) }),
  );
}

export async function mockLoginAs2FA(page: Page, challengeToken: string): Promise<void> {
  await page.route(`${API}/auth/login`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'PENDING_2FA', challengeToken, expiresInSeconds: 300 }),
    }),
  );
}

export async function mock2FAVerify(page: Page): Promise<void> {
  await page.route(`${API}/auth/2fa/verify`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOKEN_PAIR) }),
  );
  await page.route(`${API}/users/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) }),
  );
  await page.route(`${API}/auth/2fa/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, backupCodesRemaining: 0 }) }),
  );
}

// ── auth direta (sem login via UI) ────────────────────────────────────────
//
// O APP_INITIALIZER chama initSession() → _doRefresh() que lê SESSION_MARKER_KEY
// do localStorage. Se a flag estiver presente, chama POST /auth/refresh.
// Ao usar page.goto() para rotas autenticadas, o Angular faz reload completo e
// perde o estado em memória — esta helper restaura a sessão automaticamente.

export async function setupDirectAuth(page: Page): Promise<void> {
  // addInitScript roda antes de qualquer script do Angular no reload
  await page.addInitScript(() => localStorage.setItem('ss_session', '1'));

  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOKEN_PAIR) }),
  );
  await page.route(`${API}/auth/2fa/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, backupCodesRemaining: 0 }) }),
  );
  // Re-registra por último para ter prioridade sobre mocks mais genéricos (Playwright LIFO)
  await page.route(`${API}/users/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) }),
  );
}
