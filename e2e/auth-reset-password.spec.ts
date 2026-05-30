import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

test.describe('Recuperação de senha — Esqueci a senha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('exibe o formulário de recuperação', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar instruções' })).toBeVisible();
  });

  test('submit com email válido exibe mensagem de sucesso', async ({ page }) => {
    await page.route(`${API}/auth/forgot-password`, (route) =>
      route.fulfill({ status: 204 }),
    );

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByRole('button', { name: 'Enviar instruções' }).click();

    await expect(
      page.getByText('Se o email estiver cadastrado, você receberá as instruções em breve.'),
    ).toBeVisible();
  });

  test('link "Voltar ao login" navega para /auth/login', async ({ page }) => {
    await page.getByRole('link', { name: 'Voltar ao login' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Recuperação de senha — Redefinir senha', () => {
  test('exibe formulário quando token está presente na URL', async ({ page }) => {
    await page.goto('/auth/reset-password?token=abc123valid');
    await expect(page.getByLabel('Nova senha')).toBeVisible();
    await expect(page.getByLabel('Confirmar senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Redefinir senha' })).toBeVisible();
  });

  test('exibe aviso de link inválido quando token está ausente', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(
      page.getByText('Link inválido ou expirado. Solicite uma nova recuperação de senha.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Solicitar novamente' })).toBeVisible();
  });

  test('redefinição com sucesso exibe confirmação', async ({ page }) => {
    await page.route(`${API}/auth/reset-password`, (route) =>
      route.fulfill({ status: 204 }),
    );

    await page.goto('/auth/reset-password?token=abc123valid');
    await page.getByLabel('Nova senha').fill('NovaSenha@456');
    await page.getByLabel('Confirmar senha').fill('NovaSenha@456');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(page.getByText('Senha redefinida com sucesso!')).toBeVisible();
  });

  test('token inválido (400) exibe mensagem de erro', async ({ page }) => {
    await page.route(`${API}/auth/reset-password`, (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid token' }) }),
    );

    await page.goto('/auth/reset-password?token=expired');
    await page.getByLabel('Nova senha').fill('NovaSenha@456');
    await page.getByLabel('Confirmar senha').fill('NovaSenha@456');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(page.getByText('Token inválido ou expirado.')).toBeVisible();
  });

  test('senhas diferentes desabilita o botão', async ({ page }) => {
    await page.goto('/auth/reset-password?token=abc123valid');
    await page.getByLabel('Nova senha').fill('NovaSenha@456');
    await page.getByLabel('Confirmar senha').fill('DiferenteXYZ@1');
    await page.getByLabel('Confirmar senha').blur();

    await expect(page.getByText('As senhas não coincidem')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Redefinir senha' })).toBeDisabled();
  });
});
