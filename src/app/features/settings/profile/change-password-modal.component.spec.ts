import { TestBed } from '@angular/core/testing';
import { ChangePasswordModalComponent } from './change-password-modal.component';
import { ComponentRef } from '@angular/core';

describe('ChangePasswordModalComponent', () => {
  let component: ChangePasswordModalComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<ChangePasswordModalComponent>>;
  let componentRef: ComponentRef<ChangePasswordModalComponent>;

  async function setup(totpEnabled: boolean) {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordModalComponent],
    })
      .overrideTemplate(ChangePasswordModalComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ChangePasswordModalComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('totpEnabled', totpEnabled);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  // ── estado inicial ────────────────────────────────────────────────────────

  it('totpCode começa vazio e revokeOtherSessions começa false', async () => {
    await setup(false);
    expect(component.totpCode()).toBe('');
    expect(component.revokeOtherSessions()).toBe(false);
  });

  // ── submit sem TOTP ────────────────────────────────────────────────────────

  it('submit emite confirmed com totpCode undefined quando 2FA inativo', async () => {
    await setup(false);
    const spy = jest.fn();
    component.confirmed.subscribe(spy);

    component.submit();

    expect(spy).toHaveBeenCalledWith({ totpCode: undefined, revokeOtherSessions: false });
  });

  it('submit inclui revokeOtherSessions=true quando checkbox marcado', async () => {
    await setup(false);
    const spy = jest.fn();
    component.confirmed.subscribe(spy);
    component.revokeOtherSessions.set(true);

    component.submit();

    expect(spy).toHaveBeenCalledWith({ totpCode: undefined, revokeOtherSessions: true });
  });

  // ── submit com TOTP ────────────────────────────────────────────────────────

  it('submit não emite quando 2FA ativo e código incompleto', async () => {
    await setup(true);
    const spy = jest.fn();
    component.confirmed.subscribe(spy);
    component.totpCode.set('123');

    component.submit();

    expect(spy).not.toHaveBeenCalled();
  });

  it('submit emite com totpCode quando 2FA ativo e código completo', async () => {
    await setup(true);
    const spy = jest.fn();
    component.confirmed.subscribe(spy);
    component.totpCode.set('123456');

    component.submit();

    expect(spy).toHaveBeenCalledWith({ totpCode: '123456', revokeOtherSessions: false });
  });

  // ── cancelled ────────────────────────────────────────────────────────────

  it('cancelled output está disponível', async () => {
    await setup(false);
    const spy = jest.fn();
    component.cancelled.subscribe(spy);
    component.cancelled.emit();
    expect(spy).toHaveBeenCalled();
  });
});
