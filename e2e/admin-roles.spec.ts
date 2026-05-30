import { test, expect } from '@playwright/test';
import { setupDirectAuth } from './helpers';

const API = 'http://localhost:8080';

const MOCK_ROLES_PAGE = {
  content: [
    { name: 'ADMIN', permissions: ['USER_READ', 'USER_CREATE', 'ROLE_READ'] },
    { name: 'USER', permissions: ['USER_READ'] },
    { name: 'MODERATOR', permissions: [] },
  ],
  totalElements: 3, totalPages: 1, number: 0, size: 20,
};

const MOCK_PERMISSIONS_PAGE = {
  content: [
    { name: 'USER_READ' }, { name: 'USER_CREATE' }, { name: 'ROLE_READ' },
  ],
  totalElements: 3, totalPages: 1, number: 0, size: 100,
};

async function setupRolesMocks(page: import('@playwright/test').Page): Promise<void> {
  await setupDirectAuth(page);
  await page.route(/localhost:8080\/roles\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROLES_PAGE) }),
  );
  await page.route(/localhost:8080\/permissions\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PERMISSIONS_PAGE) }),
  );
  await page.route(`${API}/stats`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 5, activeUsers: 4, totalRoles: 3, totalPermissions: 3 }) }),
  );
}

test.describe('Admin — Gerenciamento de Roles', () => {
  test.beforeEach(async ({ page }) => {
    await setupRolesMocks(page);
    await page.goto('/app/settings/roles');
    await expect(page.getByRole('table', { name: 'Tabela de roles' })).toBeVisible();
  });

  test('exibe lista de roles com dados corretos', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'ADMIN', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'USER', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MODERATOR', exact: true })).toBeVisible();
  });

  test('criar nova role', async ({ page }) => {
    const newRole = { name: 'EDITOR', permissions: [] };
    await page.route(`${API}/roles`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newRole) });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: /Nova role/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nome da role').fill('EDITOR');
    await dialog.getByRole('button', { name: 'Criar' }).click();
    await expect(page.getByText(/criada/i)).toBeVisible({ timeout: 5000 });
  });

  test('excluir role exibe confirmação e chama DELETE', async ({ page }) => {
    let deleteCalled = false;
    await page.route(`${API}/roles/MODERATOR`, (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: 'Excluir MODERATOR' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText(/excluída/i)).toBeVisible({ timeout: 5000 });
    expect(deleteCalled).toBe(true);
  });

  test('busca filtra roles via campo de pesquisa', async ({ page }) => {
    let searchQuery = '';
    await page.route(/localhost:8080\/roles\?/, (route) => {
      searchQuery = new URL(route.request().url()).searchParams.get('search') ?? '';
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROLES_PAGE) });
    });

    await page.getByLabel('Buscar por nome').fill('ADMIN');
    await page.waitForTimeout(350);
    expect(searchQuery).toBe('ADMIN');
  });
});
