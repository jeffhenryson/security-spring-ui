import { test, expect } from '@playwright/test';
import { setupDirectAuth } from './helpers';

const API = 'http://localhost:8080';

const MOCK_PERMISSIONS_PAGE = {
  content: [
    { name: 'USER_READ' },
    { name: 'USER_CREATE' },
    { name: 'ROLE_READ' },
  ],
  totalElements: 3, totalPages: 1, number: 0, size: 20,
};

async function setupPermissionsMocks(page: import('@playwright/test').Page): Promise<void> {
  await setupDirectAuth(page);
  await page.route(/localhost:8080\/permissions\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PERMISSIONS_PAGE) }),
  );
  await page.route(`${API}/stats`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 5, activeUsers: 4, totalRoles: 3, totalPermissions: 3 }) }),
  );
}

test.describe('Admin — Gerenciamento de Permissões', () => {
  test.beforeEach(async ({ page }) => {
    await setupPermissionsMocks(page);
    await page.goto('/app/settings/permissions');
    await expect(page.getByRole('table', { name: 'Tabela de permissões' })).toBeVisible();
  });

  test('exibe lista de permissões', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'USER_READ', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'USER_CREATE', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ROLE_READ', exact: true })).toBeVisible();
  });

  test('criar nova permissão', async ({ page }) => {
    const newPerm = { name: 'REPORT_READ' };
    await page.route(`${API}/permissions`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newPerm) });
      } else {
        route.continue();
      }
    });

    await page.getByLabel('Nome da permissão').fill('REPORT_READ');
    await page.getByLabel('Nome da permissão').press('Enter');
    await expect(page.getByText(/criada/i)).toBeVisible({ timeout: 5000 });
  });

  test('excluir permissão exibe confirmação e chama DELETE', async ({ page }) => {
    let deleteCalled = false;
    await page.route(`${API}/permissions/ROLE_READ`, (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: 'Excluir ROLE_READ' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText(/excluída/i)).toBeVisible({ timeout: 5000 });
    expect(deleteCalled).toBe(true);
  });
});
