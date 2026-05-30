import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

// ── Verificação de email ───────────────────────────────────────────────────

test.describe('Verificação de email', () => {
  test('auto-verifica quando código vem na URL e exibe sucesso', async ({ page }) => {
    await page.route(`${API}/auth/verify-email`, (route) =>
      route.fulfill({ status: 204 }),
    );

    await page.goto('/auth/verify-email?code=ABCDEFGH1234');
    await expect(page.getByText('Email verificado! Você já pode fazer login.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir para o login' })).toBeVisible();
  });

  test('auto-verifica com código inválido exibe formulário manual', async ({ page }) => {
    await page.route(`${API}/auth/verify-email`, (route) =>
      route.fulfill({
        status: 400, contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid code' }),
      }),
    );

    await page.goto('/auth/verify-email?code=INVALIDO1234');
    await expect(page.getByText('Código inválido ou expirado.')).toBeVisible();
    await expect(page.getByLabel('Código de verificação')).toBeVisible();
  });

  test('exibe formulário manual quando não há código na URL', async ({ page }) => {
    await page.goto('/auth/verify-email');
    await expect(page.getByLabel('Código de verificação')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verificar' })).toBeVisible();
  });

  test('submit manual com código válido exibe sucesso', async ({ page }) => {
    await page.route(`${API}/auth/verify-email`, (route) =>
      route.fulfill({ status: 204 }),
    );

    await page.goto('/auth/verify-email');
    await page.getByLabel('Código de verificação').fill('ABCDEFGH1234');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page.getByText('Email verificado! Você já pode fazer login.')).toBeVisible();
  });

  test('reenviar código chama POST /auth/resend-verification', async ({ page }) => {
    let resendCalled = false;
    await page.route(`${API}/auth/resend-verification`, (route) => {
      resendCalled = true;
      route.fulfill({ status: 204 });
    });

    await page.goto('/auth/verify-email');
    await page.getByRole('button', { name: /Reenviar código/i }).click();
    await page.waitForTimeout(300);
    expect(resendCalled).toBe(true);
    await expect(page.getByRole('button', { name: /Código reenviado/i })).toBeVisible();
  });
});

// ── Confirmação de troca de email ─────────────────────────────────────────

test.describe('Confirmação de troca de email', () => {
  test('auto-confirma quando código vem na URL e exibe sucesso', async ({ page }) => {
    await page.route(`${API}/auth/confirm-email-change`, (route) =>
      route.fulfill({ status: 204 }),
    );

    await page.goto('/auth/confirm-email-change?code=ABCDEFGH1234');
    await expect(page.getByRole('link', { name: 'Ir para o perfil' })).toBeVisible();
  });

  test('código inválido exibe mensagem de erro com link para tentar novamente', async ({ page }) => {
    await page.route(`${API}/auth/confirm-email-change`, (route) =>
      route.fulfill({
        status: 400, contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid code' }),
      }),
    );

    await page.goto('/auth/confirm-email-change?code=INVALIDO1234');
    await expect(page.getByText('Código inválido ou expirado.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir para o perfil' })).toBeVisible();
  });
});
