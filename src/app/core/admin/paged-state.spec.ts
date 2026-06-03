import { PagedState } from './paged-state';

interface Item { id: number; name: string; }

describe('PagedState', () => {
  let state: PagedState<Item>;

  beforeEach(() => {
    state = new PagedState<Item>();
  });

  // ── Estado inicial ─────────────────────────────────────────────────────────

  it('inicia com rows vazio, total 0, página 0, size 10 e loading true', () => {
    expect(state.rows()).toEqual([]);
    expect(state.total()).toBe(0);
    expect(state.page()).toBe(0);
    expect(state.size()).toBe(10);
    expect(state.loading()).toBe(true);
  });

  // ── apply() ───────────────────────────────────────────────────────────────

  it('apply() atualiza rows e total a partir da resposta paginada', () => {
    state.apply({ content: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], totalElements: 42 });
    expect(state.rows()).toHaveLength(2);
    expect(state.rows()[0].name).toBe('A');
    expect(state.total()).toBe(42);
  });

  it('apply() com lista vazia reseta rows mas preserva total', () => {
    state.apply({ content: [{ id: 1, name: 'A' }], totalElements: 5 });
    state.apply({ content: [], totalElements: 0 });
    expect(state.rows()).toHaveLength(0);
    expect(state.total()).toBe(0);
  });

  // ── onPage() ──────────────────────────────────────────────────────────────

  it('onPage() atualiza page e size com o evento do paginator', () => {
    state.onPage({ pageIndex: 2, pageSize: 25, length: 100 });
    expect(state.page()).toBe(2);
    expect(state.size()).toBe(25);
  });

  it('onPage() com pageIndex 0 reseta para a primeira página', () => {
    state.page.set(3);
    state.onPage({ pageIndex: 0, pageSize: 10, length: 50 });
    expect(state.page()).toBe(0);
  });

  // ── Signals são mutáveis diretamente ──────────────────────────────────────

  it('loading pode ser alterado manualmente', () => {
    state.loading.set(false);
    expect(state.loading()).toBe(false);
    state.loading.set(true);
    expect(state.loading()).toBe(true);
  });

  it('page pode ser resetado para 0 antes de nova busca', () => {
    state.page.set(5);
    state.page.set(0);
    expect(state.page()).toBe(0);
  });
});
