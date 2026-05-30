import { TestBed } from '@angular/core/testing';
import { ThemeSettingsComponent } from './theme.component';
import { ThemeService } from '../../../core/theme/theme.service';

function makeThemeService(initial: 'dark' | 'light' | 'system' = 'dark') {
  let current = initial;
  return {
    theme: jest.fn(() => current),
    setTheme: jest.fn((v: string) => {
      current = v as typeof current;
    }),
  } as unknown as ThemeService;
}

describe('ThemeSettingsComponent', () => {
  let component: ThemeSettingsComponent;
  let themeService: ReturnType<typeof makeThemeService>;

  function setup(initial: 'dark' | 'light' | 'system' = 'dark') {
    themeService = makeThemeService(initial);
    TestBed.configureTestingModule({
      imports: [ThemeSettingsComponent],
      providers: [{ provide: ThemeService, useValue: themeService }],
    }).overrideTemplate(ThemeSettingsComponent, '');
    const fixture = TestBed.createComponent(ThemeSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  it('cria o componente', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('expõe 3 opções de tema', () => {
    setup();
    expect(component.options).toHaveLength(3);
  });

  it('isSelected retorna true para o tema atual', () => {
    setup('light');
    expect(component.isSelected('light')).toBe(true);
    expect(component.isSelected('dark')).toBe(false);
  });

  it('select chama themeService.setTheme com o valor correto', () => {
    setup('dark');
    component.select('system');
    expect(themeService.setTheme).toHaveBeenCalledWith('system');
  });

  it('select funciona para os 3 modos', () => {
    setup();
    for (const theme of ['dark', 'light', 'system'] as const) {
      component.select(theme);
      expect(themeService.setTheme).toHaveBeenCalledWith(theme);
    }
  });
});
