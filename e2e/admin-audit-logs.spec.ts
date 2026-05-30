import { test, expect } from '@playwright/test';
import { setupDirectAuth } from './helpers';

const API = 'http://localhost:8080';

const MOCK_ENTRIES = [
  {
    id: 1, timestamp: '2026-05-30T10:00:00Z', action: 'USER_LOGGED_IN',
    who: 'admin', target: null, ipAddress: '192.168.1.1',
  },
  {
    id: 2, timestamp: '2026-05-30T09:30:00Z', action: 'USER_CREATED',
    who: 'admin', target: 'alice', ipAddress: '192.168.1.1',
  },
  {
    id: 3, timestamp: '2026-05-30T09:00:00Z', action: 'USER_DELETED',
    who: 'admin', target: 'bob', ipAddress: '10.0.0.1',
  },
];

const MOCK_PAGE = {
  content: MOCK_ENTRIES,
  totalElements: 3,
  totalPages: 1,
  page: 0,
  size: 25,
};

const EMPTY_PAGE = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 25 };

async function setupAuditMocks(
  page: import('@playwright/test').Page,
  response = MOCK_PAGE,
): Promise<void> {
  await setupDirectAuth(page);
  await page.route(`${API}/stats`, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalUsers: 5, activeUsers: 4, totalRoles: 3, totalPermissions: 14 }),
    }),
  );
  await page.route(/localhost:8080\/audit-logs\?/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) }),
  );
}

test.describe('Admin — Logs de auditoria', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuditMocks(page);
    await page.goto('/app/settings/audit-logs');
    await expect(page.getByRole('table', { name: 'Logs de auditoria' })).toBeVisible();
  });

  test('exibe lista de logs com dados corretos', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'USER_LOGGED_IN' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'USER_CREATED' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'alice' })).toBeVisible();
  });

  test('filtro por usuário envia parâmetro userId', async ({ page }) => {
    let capturedUrl = '';
    await page.route(/localhost:8080\/audit-logs\?/, (route) => {
      capturedUrl = route.request().url();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PAGE) });
    });

    await page.getByLabel('Filtrar por usuário').fill('alice');
    await page.waitForTimeout(350);

    expect(new URL(capturedUrl).searchParams.get('userId')).toBe('alice');
  });

  test('filtro por ação envia parâmetro action', async ({ page }) => {
    let capturedUrl = '';
    await page.route(/localhost:8080\/audit-logs\?/, (route) => {
      capturedUrl = route.request().url();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PAGE) });
    });

    await page.getByLabel('Tipo de ação').click();
    await page.getByRole('option', { name: 'USER_LOGGED_IN' }).click();
    await page.waitForTimeout(350);

    expect(new URL(capturedUrl).searchParams.get('action')).toBe('USER_LOGGED_IN');
  });

  test('paginação avança corretamente', async ({ page }) => {
    const TWO_PAGES = {
      content: MOCK_ENTRIES,
      totalElements: 53,
      totalPages: 3,
      page: 0,
      size: 25,
    };
    await page.route(/localhost:8080\/audit-logs\?/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TWO_PAGES) }),
    );
    await page.goto('/app/settings/audit-logs');

    let capturedUrl = '';
    await page.route(/localhost:8080\/audit-logs\?/, (route) => {
      capturedUrl = route.request().url();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TWO_PAGES) });
    });

    await page.getByRole('button', { name: 'Next page' }).click();
    await page.waitForTimeout(300);

    expect(new URL(capturedUrl).searchParams.get('page')).toBe('1');
  });

  test('exibe empty state quando não há logs', async ({ page }) => {
    await page.route(/localhost:8080\/audit-logs\?/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_PAGE) }),
    );
    await page.goto('/app/settings/audit-logs');
    await expect(page.getByText('Nenhum log encontrado.')).toBeVisible();
  });
});
