import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'ss_theme';

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockReturnValue({ matches: prefersDark, addEventListener: jest.fn() }),
    writable: true,
  });
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    mockMatchMedia(true); // default: OS prefere dark
  });

  afterEach(() => localStorage.clear());

  function createService(): ThemeService {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  it('usa "dark" como padrão quando nada está salvo', () => {
    const service = createService();
    expect(service.theme()).toBe('dark');
  });

  it('carrega o tema salvo no localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const service = createService();
    expect(service.theme()).toBe('light');
  });

  it('setTheme atualiza o signal e persiste no localStorage', () => {
    const service = createService();
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('setTheme para "system" persiste "system" no localStorage', () => {
    const service = createService();
    service.setTheme('system');
    expect(service.theme()).toBe('system');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('resolvedTheme retorna "dark" para tema "dark"', () => {
    const service = createService();
    service.setTheme('dark');
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('resolvedTheme retorna "light" para tema "light"', () => {
    const service = createService();
    service.setTheme('light');
    expect(service.resolvedTheme()).toBe('light');
  });

  it('resolvedTheme retorna "dark" quando sistema é "system" e OS prefere dark', () => {
    mockMatchMedia(true);
    const service = createService();
    service.setTheme('system');
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('resolvedTheme retorna "light" quando sistema é "system" e OS prefere light', () => {
    mockMatchMedia(false);
    const service = createService();
    service.setTheme('system');
    expect(service.resolvedTheme()).toBe('light');
  });

  it('aplica "theme-dark" ao documentElement', () => {
    const service = createService();
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
  });

  it('aplica "theme-light" ao documentElement', () => {
    const service = createService();
    service.setTheme('light');
    TestBed.flushEffects();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
  });
});
