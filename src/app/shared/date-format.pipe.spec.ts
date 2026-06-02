import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;

  beforeEach(() => {
    pipe = new DateFormatPipe();
  });

  // ── modo abs (padrão) ─────────────────────────────────────────────────────

  it('retorna "—" para null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('retorna "—" para string vazia', () => {
    expect(pipe.transform('')).toBe('—');
  });

  it('retorna "—" para data inválida', () => {
    expect(pipe.transform('not-a-date')).toBe('—');
  });

  it('formata ISO para pt-BR com dia/mês/ano', () => {
    const result = pipe.transform('2026-01-15T14:30:00Z');
    expect(result).toMatch(/15\/01\/2026/);
  });

  it('modo abs é o padrão', () => {
    const explicit = pipe.transform('2026-06-02T10:00:00Z', 'abs');
    const implicit = pipe.transform('2026-06-02T10:00:00Z');
    expect(explicit).toBe(implicit);
  });

  // ── modo rel ──────────────────────────────────────────────────────────────

  it('retorna "agora" para data muito recente (< 1 min)', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(pipe.transform(recent, 'rel')).toBe('agora');
  });

  it('retorna "há N min" para data de alguns minutos atrás', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(pipe.transform(fiveMinAgo, 'rel')).toBe('há 5 min');
  });

  it('retorna "há Nh" para data de algumas horas atrás', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    expect(pipe.transform(twoHoursAgo, 'rel')).toBe('há 2h');
  });

  it('retorna "há Nd" para data de alguns dias atrás', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    expect(pipe.transform(threeDaysAgo, 'rel')).toBe('há 3d');
  });
});
