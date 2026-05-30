import { test, expect } from '@playwright/test';
import { mockLogin } from './helpers';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
  });

  test('exibe o formulário de login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('SecuritySpring')).toBeVisible();
    await expect(page.getByLabel('Usuário')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('login com credenciais válidas redireciona para o dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Senha').fill('password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('exibe erro com credenciais inválidas', async ({ page }) => {
    // sobrescreve o mock para retornar 401
    await page.route('http://localhost:8080/auth/login', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) }),
    );
    await page.goto('/auth/login');
    await page.getByLabel('Usuário').fill('wrong');
    await page.getByLabel('Senha').fill('wrong');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Usuário ou senha inválidos.')).toBeVisible();
  });

  test('bloqueia o botão após 5 tentativas falhas', async ({ page }) => {
    await page.route('http://localhost:8080/auth/login', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) }),
    );
    await page.goto('/auth/login');
    const submitBtn = page.getByRole('button', { name: 'Entrar' });
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Usuário').fill('wrong');
      await page.getByLabel('Senha').fill('wrong');
      await submitBtn.click();
    }
    await expect(page.getByText(/Muitas tentativas/)).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test('link "Esqueceu a senha?" navega corretamente', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'Esqueceu a senha?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });
});
