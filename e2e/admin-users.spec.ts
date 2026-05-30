import { test, expect } from '@playwright/test';
import { setupDirectAuth } from './helpers';

const API = 'http://localhost:8080';

const MOCK_ROLES_PAGE = {
  content: [{ name: 'USER' }, { name: 'ADMIN' }],
  totalElements: 2, totalPages: 1, number: 0, size: 50,
};
const MOCK_USERS_PAGE = {
  content: [
    { id: 1, username: 'alice', email: 'alice@example.com', enabled: true, emailVerified: true, roles: ['USER'] },
    { id: 2, username: 'bob', email: 'bob@example.com', enabled: false, emailVerified: true, roles: ['USER', 'ADMIN'] },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 20,
};

async function setupUsersMocks(page: import('@playwright/test').Page): Promise<void> {
  // Autentica diretamente via localStorage + mock de /auth/refresh (sem passar pelo login UI)
  await setupDirectAuth(page);

  // Usa regex com \? literal para evitar conflito com /users/me
  await page.route(/localhost:8080\/users\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS_PAGE) }),
  );
  await page.route(/localhost:8080\/roles\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROLES_PAGE) }),
  );
  await page.route(`${API}/stats`, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 10, activeUsers: 8, totalRoles: 2, totalPermissions: 14 }),
    }),
  );
}

test.describe('Admin — Gerenciamento de usuários', () => {
  test.beforeEach(async ({ page }) => {
    await setupUsersMocks(page);
    await page.goto('/app/settings/users');
    await expect(page.getByRole('table', { name: 'Tabela de usuários' })).toBeVisible();
  });

  test('exibe lista de usuários com dados corretos', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'alice', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'bob', exact: true })).toBeVisible();
  });

  test('criar novo usuário', async ({ page }) => {
    const newUser = {
      id: 3, username: 'charlie', email: 'charlie@example.com',
      enabled: true, emailVerified: true, roles: [],
    };
    await page.route(`${API}/users`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newUser) });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: /Novo usuário/ }).click();

    // Escopa ao dialog para evitar conflito com coluna "Usuário" da tabela
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Usuário', { exact: true }).fill('charlie');
    await dialog.getByLabel('Email (opcional)').fill('charlie@example.com');
    await dialog.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await dialog.getByRole('button', { name: 'Criar' }).click();
    await expect(page.getByText(/criado/i)).toBeVisible({ timeout: 5000 });
  });

  test('excluir usuário exibe confirmação e chama DELETE', async ({ page }) => {
    let deleteCalled = false;
    await page.route(`${API}/users/2`, (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: 'Excluir bob' }).click();
    // O confirmLabel no delete é 'Excluir' (não 'Confirmar')
    await expect(page.getByText(/Excluir permanentemente/)).toBeVisible();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText(/excluído/i)).toBeVisible({ timeout: 5000 });
    expect(deleteCalled).toBe(true);
  });

  test('busca filtra usuários via campo de pesquisa', async ({ page }) => {
    let searchQuery = '';
    await page.route(/localhost:8080\/users\?/, (route) => {
      searchQuery = new URL(route.request().url()).searchParams.get('search') ?? '';
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS_PAGE) });
    });

    // O campo usa mat-label "Buscar por nome ou email" (sem placeholder)
    await page.getByLabel('Buscar por nome ou email').fill('alice');
    await page.waitForTimeout(350); // aguarda debounce de 300ms
    expect(searchQuery).toBe('alice');
  });
});
