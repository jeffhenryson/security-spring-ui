import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { AppConfigStore } from '../../core/config/app-config.store';

describe('LandingComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).overrideTemplate(LandingComponent, '');
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    const configStore = TestBed.inject(AppConfigStore);
    return { fixture, component, configStore };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('cria o componente', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  it('expõe as 6 features', () => {
    const { component } = setup();
    expect(component.features).toHaveLength(6);
  });

  it('expõe os 8 badges de tecnologia', () => {
    const { component } = setup();
    expect(component.badges).toHaveLength(8);
  });

  // ── registrationEnabled ───────────────────────────────────────────────────

  it('registrationEnabled = true quando config não define o valor (padrão)', () => {
    const { component } = setup();
    expect(component.registrationEnabled()).toBe(true);
  });

  it('registrationEnabled = false quando config desabilita registro', () => {
    const { component, configStore } = setup();
    configStore.setConfig({ 'auth.registration.enabled': 'false' });
    expect(component.registrationEnabled()).toBe(false);
  });

  it('registrationEnabled = true quando config habilita registro explicitamente', () => {
    const { component, configStore } = setup();
    configStore.setConfig({ 'auth.registration.enabled': 'true' });
    expect(component.registrationEnabled()).toBe(true);
  });
});
