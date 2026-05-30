import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

test.describe('Registro de conta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('exibe o formulário de registro', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
    await expect(page.getByLabel('Usuário')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirmar senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
  });

  test('registro com sucesso exibe mensagem de confirmação', async ({ page }) => {
    await page.route(`${API}/auth/register`, (route) =>
      route.fulfill({ status: 201 }),
    );

    await page.getByLabel('Usuário').fill('newuser');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('Conta criada! Verifique seu email para ativar a conta.')).toBeVisible();
  });

  test('exibe erro quando usuário ou email já existe (409)', async ({ page }) => {
    await page.route(`${API}/auth/register`, (route) =>
      route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Conflict' }) }),
    );

    await page.getByLabel('Usuário').fill('admin');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('Usuário ou email já cadastrado.')).toBeVisible();
  });

  test('exibe erro quando as senhas não coincidem', async ({ page }) => {
    await page.getByLabel('Usuário').fill('newuser');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar senha').fill('Diferente@456');
    await page.getByLabel('Confirmar senha').blur();

    await expect(page.getByText('As senhas não coincidem')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  test('link "Entrar" navega para /auth/login', async ({ page }) => {
    await page.getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
