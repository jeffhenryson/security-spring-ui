import { TestBed } from '@angular/core/testing';
import { DevElevationBannerComponent } from './dev-elevation-banner.component';
import { AuthStore } from '../../../core/auth/auth.store';

function makeStore(elevated = false, expiresAt = 0): Partial<AuthStore> {
  return {
    isDevElevated: Object.assign(() => elevated, { asReadonly: () => () => elevated }),
    devTokenExpiresAt: Object.assign(() => expiresAt, { asReadonly: () => () => expiresAt }),
    clearDevToken: jest.fn(),
  } as unknown as Partial<AuthStore>;
}

describe('DevElevationBannerComponent', () => {
  function setup(elevated: boolean, expiresAt = Date.now() + 3_600_000) {
    const store = makeStore(elevated, expiresAt);
    TestBed.configureTestingModule({
      imports: [DevElevationBannerComponent],
      providers: [{ provide: AuthStore, useValue: store }],
    }).overrideTemplate(DevElevationBannerComponent, '');
    const fixture = TestBed.createComponent(DevElevationBannerComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, store };
  }

  it('cria o componente', () => {
    const { component } = setup(false);
    expect(component).toBeTruthy();
  });

  it('isDevElevated reflete o estado da store', () => {
    const { component } = setup(true);
    expect(component.isDevElevated()).toBe(true);
  });

  it('revoke() chama store.clearDevToken()', () => {
    const { component, store } = setup(true);
    component.revoke();
    expect(store.clearDevToken).toHaveBeenCalled();
  });

  it('progressPercent é 100% no início da elevação', () => {
    const expiresAt = Date.now() + 3_600_000;
    const { component } = setup(true, expiresAt);
    expect(component.progressPercent()).toBeCloseTo(100, 0);
  });

  it('formattedTime retorna formato MM:SS', () => {
    const { component } = setup(false);
    const time = component.formattedTime();
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });
});
