import { test, expect } from '@playwright/test';
import { mockLoginAs2FA, mock2FAVerify } from './helpers';

const CHALLENGE_TOKEN = 'mock-challenge-token-abc123';

test.describe('Login com 2FA', () => {
  test('login redireciona para tela de 2FA quando desafiado', async ({ page }) => {
    await mockLoginAs2FA(page, CHALLENGE_TOKEN);
    await page.goto('/auth/login');
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/auth\/2fa/);
    await expect(page.getByText('Verificação em 2 etapas')).toBeVisible();
  });

  test('tela de 2FA exibe sessão expirada quando não há token em memória', async ({ page }) => {
    await page.goto('/auth/2fa');
    await expect(page.getByText('Sessão expirada')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir para o login' })).toBeVisible();
  });

  test('2FA completo redireciona para o dashboard', async ({ page }) => {
    await mockLoginAs2FA(page, CHALLENGE_TOKEN);
    await mock2FAVerify(page);

    // faz login para gerar o challenge token em memória
    await page.goto('/auth/login');
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/auth\/2fa/);

    // preenche o código TOTP (6 dígitos — auto-submit ao completar)
    await page.getByLabel('Código TOTP').fill('123456');
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('código inválido exibe mensagem de erro', async ({ page }) => {
    await mockLoginAs2FA(page, CHALLENGE_TOKEN);
    await page.route('http://localhost:8080/auth/2fa/verify', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_code' }) }),
    );

    await page.goto('/auth/login');
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('password');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.getByLabel('Código TOTP').fill('000000');
    await expect(page.getByText('Código inválido ou expirado.')).toBeVisible();
  });
});
