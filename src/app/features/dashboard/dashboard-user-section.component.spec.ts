import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardUserSectionComponent } from './dashboard-user-section.component';

function create(inputs: { totpEnabled: boolean; emailVerified: boolean; hasEmail: boolean; totalPermissions: number }) {
  const fixture = TestBed.createComponent(DashboardUserSectionComponent);
  fixture.componentRef.setInput('totpEnabled', inputs.totpEnabled);
  fixture.componentRef.setInput('emailVerified', inputs.emailVerified);
  fixture.componentRef.setInput('hasEmail', inputs.hasEmail);
  fixture.componentRef.setInput('totalPermissions', inputs.totalPermissions);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('DashboardUserSectionComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [DashboardUserSectionComponent],
      providers: [provideRouter([])],
    }).overrideTemplate(DashboardUserSectionComponent, ''),
  );

  it('cria o componente com 2FA ativo', () => {
    const c = create({ totpEnabled: true, emailVerified: true, hasEmail: true, totalPermissions: 5 });
    expect(c.totpEnabled()).toBe(true);
    expect(c.emailVerified()).toBe(true);
    expect(c.totalPermissions()).toBe(5);
  });

  it('cria o componente com 2FA inativo', () => {
    const c = create({ totpEnabled: false, emailVerified: false, hasEmail: false, totalPermissions: 2 });
    expect(c.totpEnabled()).toBe(false);
    expect(c.hasEmail()).toBe(false);
  });
});
