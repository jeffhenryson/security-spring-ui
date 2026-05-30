import { test, expect } from '@playwright/test';
import { setupDirectAuth, MOCK_USER } from './helpers';

const API = 'http://localhost:8080';

async function setupProfileMocks(page: import('@playwright/test').Page): Promise<void> {
  await setupDirectAuth(page);
  await page.route(`${API}/stats`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 5, activeUsers: 4, totalRoles: 3, totalPermissions: 14 }) }),
  );
}

test.describe('Settings — Perfil', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfileMocks(page);
    await page.goto('/app/settings/profile');
    await expect(page.getByRole('heading', { name: 'Dados do perfil' })).toBeVisible();
  });

  test('exibe dados do usuário logado', async ({ page }) => {
    await expect(page.getByLabel('Usuário')).toHaveValue(MOCK_USER.username);
    await expect(page.getByLabel('Email')).toHaveValue(MOCK_USER.email);
  });

  test('salvar perfil chama PATCH /users/me', async ({ page }) => {
    let patchCalled = false;
    await page.route(`${API}/users/me`, (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ...MOCK_USER, username: 'admin2' }) });
      } else {
        route.continue();
      }
    });

    const usernameField = page.getByLabel('Usuário');
    await usernameField.clear();
    await usernameField.fill('admin2');
    await page.getByRole('button', { name: 'Salvar perfil' }).click();
    await expect(page.getByText(/atualizado/i)).toBeVisible({ timeout: 5000 });
    expect(patchCalled).toBe(true);
  });

  test('alterar senha exige os 3 campos preenchidos', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: 'Alterar senha' });
    await expect(saveBtn).toBeDisabled();

    await page.getByLabel('Senha atual').last().fill('senha123');
    await page.getByLabel('Nova senha', { exact: true }).fill('novaSenha@1');
    await page.getByLabel('Confirmar nova senha').fill('novaSenha@1');
    await expect(saveBtn).toBeEnabled();
  });

  test('navegar para Segurança via menu lateral', async ({ page }) => {
    await page.getByRole('link', { name: 'Segurança' }).click();
    await expect(page).toHaveURL(/settings\/security/);
  });
});
