import { test, expect } from '@playwright/test';
import { setupDirectAuth, MOCK_USER, MOCK_TOKEN_PAIR } from './helpers';

const API = 'http://localhost:8080';

const MOCK_SESSIONS = [
  {
    id: 1,
    createdAt: '2026-05-30T08:00:00Z',
    expiresAt: '2026-06-06T08:00:00Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Chrome/120',
  },
  {
    id: 2,
    createdAt: '2026-05-30T09:00:00Z',
    expiresAt: '2026-06-06T09:00:00Z',
    ipAddress: '10.0.0.5',
    userAgent: 'Mozilla/5.0 Firefox/121',
  },
];

async function setupSecurityMocks(
  page: import('@playwright/test').Page,
  totpEnabled = false,
): Promise<void> {
  await setupDirectAuth(page);

  // O componente lê totpEnabled de currentUser() — precisamos sobrescrever o mock de /users/me
  // se totpEnabled=true. Playwright é LIFO: rota registrada depois tem prioridade.
  if (totpEnabled) {
    await page.route(`${API}/users/me`, (route) =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_USER, totpEnabled: true }),
      }),
    );
  }

  await page.route(`${API}/auth/sessions`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_SESSIONS),
      });
    } else {
      route.continue();
    }
  });

  await page.route(`${API}/stats`, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 5, activeUsers: 4, totalRoles: 3, totalPermissions: 14 }),
    }),
  );
}

test.describe('Settings — Segurança', () => {
  // ── 2FA não configurado ───────────────────────────────────────────────────

  test.describe('2FA não configurado', () => {
    test.beforeEach(async ({ page }) => {
      await setupSecurityMocks(page, false);
      await page.goto('/app/settings/security');
      await expect(page.getByText('2FA não configurado')).toBeVisible();
    });

    test('exibe botão "Configurar 2FA"', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Configurar 2FA' })).toBeVisible();
    });

    test('fluxo de setup: clica → exibe campo TOTP → confirma → exibe backup codes', async ({ page }) => {
      await page.route(`${API}/auth/2fa/setup`, (route) =>
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/test' }),
        }),
      );
      await page.route(`${API}/auth/2fa/confirm`, (route) =>
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ backupCodes: ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFFF'] }),
        }),
      );

      await page.getByRole('button', { name: 'Configurar 2FA' }).click();
      await expect(page.getByLabel('Código TOTP (6 dígitos)')).toBeVisible();

      await page.getByLabel('Código TOTP (6 dígitos)').fill('123456');
      await page.getByRole('button', { name: 'Confirmar' }).click();

      await expect(page.getByText('Guarde estes códigos em lugar seguro!')).toBeVisible();
      await expect(page.getByText('AAAA-BBBB')).toBeVisible();
    });

    test('cancelar setup retorna ao estado idle', async ({ page }) => {
      await page.route(`${API}/auth/2fa/setup`, (route) =>
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/test' }),
        }),
      );

      await page.getByRole('button', { name: 'Configurar 2FA' }).click();
      await expect(page.getByLabel('Código TOTP (6 dígitos)')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.getByRole('button', { name: 'Configurar 2FA' })).toBeVisible();
    });
  });

  // ── 2FA ativado ───────────────────────────────────────────────────────────

  test.describe('2FA ativado', () => {
    test.beforeEach(async ({ page }) => {
      await setupSecurityMocks(page, true);
      await page.goto('/app/settings/security');
      await expect(page.getByText('2FA ativado')).toBeVisible();
    });

    test('exibe botões "Regenerar backup codes" e "Desabilitar 2FA"', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Regenerar backup codes' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Desabilitar 2FA' })).toBeVisible();
    });

    test('fluxo de disable: preenche senha e código, chama DELETE /auth/2fa', async ({ page }) => {
      let deleteCalled = false;
      await page.route(`${API}/auth/2fa`, (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCalled = true;
          route.fulfill({ status: 204 });
        } else {
          route.continue();
        }
      });
      // Após disable, o store recarrega currentUser — mock retorna user com totpEnabled: false
      await page.route(`${API}/users/me`, (route) =>
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ ...MOCK_USER, totpEnabled: false }),
        }),
      );

      await page.getByRole('button', { name: 'Desabilitar 2FA' }).click();
      await expect(page.getByLabel('Senha atual')).toBeVisible();

      await page.getByLabel('Senha atual').fill('MinhaS3nha@');
      await page.getByLabel('Código TOTP').fill('654321');
      await page.getByRole('button', { name: 'Desabilitar 2FA' }).click();

      await expect(page.getByText(/desabilitado/i)).toBeVisible({ timeout: 5000 });
      expect(deleteCalled).toBe(true);
    });

    test('cancelar disable retorna ao estado idle', async ({ page }) => {
      await page.getByRole('button', { name: 'Desabilitar 2FA' }).click();
      await expect(page.getByLabel('Senha atual')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.getByText('2FA ativado')).toBeVisible();
    });
  });

  // ── Sessões ativas ────────────────────────────────────────────────────────

  test.describe('Sessões ativas', () => {
    test.beforeEach(async ({ page }) => {
      await setupSecurityMocks(page);
      await page.goto('/app/settings/security');
      await expect(page.getByRole('table', { name: 'Sessões ativas' })).toBeVisible();
    });

    test('exibe lista de sessões com IPs corretos', async ({ page }) => {
      await expect(page.getByRole('cell', { name: '192.168.1.1' })).toBeVisible();
      await expect(page.getByRole('cell', { name: '10.0.0.5' })).toBeVisible();
    });

    test('encerrar sessão individual chama DELETE /auth/sessions/{id}', async ({ page }) => {
      let deleteCalled = false;
      await page.route(`${API}/auth/sessions/1`, (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCalled = true;
          route.fulfill({ status: 204 });
        } else {
          route.continue();
        }
      });

      await page.getByRole('button', { name: 'Encerrar sessão 1' }).click();
      await expect(page.getByText('Sessão encerrada.')).toBeVisible({ timeout: 5000 });
      expect(deleteCalled).toBe(true);
    });

    test('encerrar todas: confirma dialog e navega para /auth/login', async ({ page }) => {
      let deleteAllCalled = false;
      await page.route(`${API}/auth/sessions`, (route) => {
        if (route.request().method() === 'DELETE') {
          deleteAllCalled = true;
          route.fulfill({ status: 204 });
        } else {
          route.continue();
        }
      });
      // Mock login page após navegação
      await page.route(`${API}/auth/login`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOKEN_PAIR) }),
      );

      await page.getByRole('button', { name: 'Encerrar todas' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Encerrar', exact: true }).click();

      await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 });
      expect(deleteAllCalled).toBe(true);
    });
  });
});
