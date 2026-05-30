import { TestBed } from '@angular/core/testing';
import { PasswordStrengthComponent } from './password-strength.component';

describe('PasswordStrengthComponent', () => {
  let component: PasswordStrengthComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordStrengthComponent],
    })
      .overrideTemplate(PasswordStrengthComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(PasswordStrengthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── pw() computed ─────────────────────────────────────────────────────────

  it('pw() retorna string vazia quando password é null', () => {
    TestBed.runInInjectionContext(() => {
      expect(component.pw()).toBe('');
    });
  });

  // ── strengthLabel ─────────────────────────────────────────────────────────

  it('strengthLabel retorna "Muito fraca" para senha vazia', () => {
    expect(component.strengthLabel()).toBe('Muito fraca');
  });

  it('strengthLabel retorna "Muito forte" para senha que satisfaz todas as regras', () => {
    TestBed.runInInjectionContext(() => {
      const fixture = TestBed.createComponent(PasswordStrengthComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('password', 'Senha@123');
      fixture.detectChanges();
      expect(c.strengthLabel()).toBe('Muito forte');
    });
  });

  it('strengthLabel retorna "Média" para senha com 3 regras', () => {
    TestBed.runInInjectionContext(() => {
      const fixture = TestBed.createComponent(PasswordStrengthComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('password', 'Abc1234'); // sem especial
      fixture.detectChanges();
      expect(c.strengthLabel()).toBe('Média');
    });
  });

  // ── labelColor ────────────────────────────────────────────────────────────

  it('labelColor retorna text-red-400 para senha muito fraca', () => {
    expect(component.labelColor()).toBe('text-red-400');
  });

  it('labelColor retorna text-emerald-400 para senha muito forte', () => {
    TestBed.runInInjectionContext(() => {
      const fixture = TestBed.createComponent(PasswordStrengthComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('password', 'Senha@123');
      fixture.detectChanges();
      expect(c.labelColor()).toBe('text-emerald-400');
    });
  });

  // ── barColor ──────────────────────────────────────────────────────────────

  it('barColor retorna cor desabilitada para índices acima do score', () => {
    expect(component.barColor(3)).toBe('bg-[var(--border-color)]');
  });

  it('barColor retorna bg-emerald-500 para todos os segmentos com senha forte', () => {
    TestBed.runInInjectionContext(() => {
      const fixture = TestBed.createComponent(PasswordStrengthComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('password', 'Senha@123');
      fixture.detectChanges();
      expect(c.barColor(0)).toBe('bg-emerald-500');
      expect(c.barColor(4)).toBe('bg-emerald-500');
    });
  });

  // ── rules ─────────────────────────────────────────────────────────────────

  it('rules tem 5 regras', () => {
    expect(component.rules).toHaveLength(5);
  });

  it('segments tem 5 segmentos [0..4]', () => {
    expect(component.segments).toEqual([0, 1, 2, 3, 4]);
  });
});
