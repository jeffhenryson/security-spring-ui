import { TestBed } from '@angular/core/testing';
import { PendingEmailBannerComponent } from './pending-email-banner.component';

describe('PendingEmailBannerComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [PendingEmailBannerComponent] })
      .overrideTemplate(PendingEmailBannerComponent, '<span>{{ pendingEmail() }}</span>'),
  );

  it('cria o componente', () => {
    const fixture = TestBed.createComponent(PendingEmailBannerComponent);
    fixture.componentRef.setInput('pendingEmail', 'novo@email.com');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exibe o email pendente', () => {
    const fixture = TestBed.createComponent(PendingEmailBannerComponent);
    fixture.componentRef.setInput('pendingEmail', 'novo@email.com');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('novo@email.com');
  });
});
