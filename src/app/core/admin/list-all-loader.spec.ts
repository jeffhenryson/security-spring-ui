import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListAllLoader } from './list-all-loader';

const URL = 'http://localhost/roles';
const ITEM_A = { name: 'ADMIN' };
const ITEM_B = { name: 'VIEWER' };

function flush(controller: HttpTestingController, items: unknown[], total: number, page = 0) {
  controller
    .expectOne(`${URL}?page=${page}&size=100`)
    .flush({ content: items, totalElements: total });
}

describe('ListAllLoader', () => {
  let loader: ListAllLoader<{ name: string }>;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);
    loader = new ListAllLoader(http, URL);
  });

  afterEach(() => controller.verify());

  // ── Página única ───────────────────────────────────────────────────────────

  it('retorna todos os itens quando cabem em uma página', async () => {
    const promise = loader.load();
    flush(controller, [ITEM_A, ITEM_B], 2);
    const result = await promise;
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('ADMIN');
  });

  // ── Múltiplas páginas ──────────────────────────────────────────────────────

  it('busca páginas adicionais quando totalElements > PAGE_SIZE(100)', async () => {
    const promise = loader.load();
    flush(controller, [ITEM_A], 101, 0);
    await Promise.resolve(); // resolve a primeira página
    flush(controller, [ITEM_B], 101, 1);
    const result = await promise;
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(['ADMIN', 'VIEWER']);
  });

  // ── Cache: hit dentro do TTL ───────────────────────────────────────────────

  it('segunda chamada dentro do TTL retorna cache sem nova request HTTP', async () => {
    const first = loader.load();
    flush(controller, [ITEM_A], 1);
    await first;

    // Segunda chamada — não deve fazer HTTP
    const second = await loader.load();
    controller.expectNone(`${URL}?page=0&size=100`);
    expect(second).toHaveLength(1);
    expect(second[0].name).toBe('ADMIN');
  });

  // ── Cache: invalidate() força novo fetch ───────────────────────────────────

  it('invalidate() descarta o cache e força novo fetch HTTP', async () => {
    const first = loader.load();
    flush(controller, [ITEM_A], 1);
    await first;

    loader.invalidate();

    const second = loader.load();
    flush(controller, [ITEM_B], 1); // retorna dados diferentes para confirmar novo fetch
    const result = await second;
    expect(result[0].name).toBe('VIEWER');
  });

  // ── Cache: TTL expirado ────────────────────────────────────────────────────

  it('faz novo fetch quando o cache TTL expirou', async () => {
    // Loader com TTL de 0ms: qualquer chamada subsequente é considerada expirada
    const httpClient = TestBed.inject(HttpClient);
    const shortTtlLoader = new ListAllLoader<{ name: string }>(httpClient, URL, 0);

    const first = shortTtlLoader.load();
    flush(controller, [ITEM_A], 1);
    await first;

    // TTL = 0ms → cache expirado imediatamente
    const second = shortTtlLoader.load();
    flush(controller, [ITEM_B], 1);
    const result = await second;
    expect(result[0].name).toBe('VIEWER');
  });
});
