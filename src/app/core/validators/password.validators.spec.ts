import { FormBuilder, FormControl } from '@angular/forms';
import { passwordMatchValidator, passwordPolicyValidator } from './password.validators';

describe('passwordMatchValidator', () => {
  const fb = new FormBuilder();

  // ── Formulário com campo "password" (register) ────────────────────────────

  it('retorna null quando password e confirmPassword são iguais', () => {
    const group = fb.group(
      { password: ['abc123'], confirmPassword: ['abc123'] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toBeNull();
  });

  it('retorna { passwordMismatch: true } quando são diferentes', () => {
    const group = fb.group(
      { password: ['abc123'], confirmPassword: ['different'] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toEqual({ passwordMismatch: true });
  });

  // ── Formulário com campo "newPassword" (profile / reset) ──────────────────

  it('funciona com newPassword em vez de password', () => {
    const group = fb.group(
      { newPassword: ['secret'], confirmPassword: ['secret'] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toBeNull();
  });

  it('detecta mismatch com newPassword', () => {
    const group = fb.group(
      { newPassword: ['secret'], confirmPassword: ['wrong'] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toEqual({ passwordMismatch: true });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('retorna null quando ambos os campos estão ausentes do grupo', () => {
    const group = fb.group({ email: ['user@example.com'] }, { validators: passwordMatchValidator });
    expect(group.errors).toBeNull();
  });

  it('retorna null quando confirmPassword está ausente', () => {
    const group = fb.group({ password: ['abc123'] }, { validators: passwordMatchValidator });
    expect(group.errors).toBeNull();
  });

  it('considera strings vazias iguais (ambas "")', () => {
    const group = fb.group(
      { password: [''], confirmPassword: [''] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toBeNull();
  });

  it('detecta mismatch entre string vazia e não-vazia', () => {
    const group = fb.group(
      { password: [''], confirmPassword: ['abc'] },
      { validators: passwordMatchValidator },
    );
    expect(group.errors).toEqual({ passwordMismatch: true });
  });
});

describe('passwordPolicyValidator', () => {
  function ctrl(value: string) {
    return new FormControl(value);
  }

  it('retorna null para campo vazio (required cuida disso)', () => {
    expect(passwordPolicyValidator(ctrl(''))).toBeNull();
  });

  it('retorna minlength para senha com menos de 8 chars', () => {
    expect(passwordPolicyValidator(ctrl('Ab1@xx'))).toEqual({
      minlength: { requiredLength: 8, actualLength: 6 },
    });
  });

  it('retorna passwordPolicy quando falta maiúscula', () => {
    expect(passwordPolicyValidator(ctrl('abcde1@x'))).toEqual({ passwordPolicy: true });
  });

  it('retorna passwordPolicy quando falta dígito', () => {
    expect(passwordPolicyValidator(ctrl('Abcdefg@'))).toEqual({ passwordPolicy: true });
  });

  it('retorna passwordPolicy quando falta caractere especial', () => {
    expect(passwordPolicyValidator(ctrl('Abcdef12'))).toEqual({ passwordPolicy: true });
  });

  it('retorna null para senha válida', () => {
    expect(passwordPolicyValidator(ctrl('Abcde1@x'))).toBeNull();
  });

  it('retorna maxlength para senha com mais de 120 chars', () => {
    const long = 'Aa1@' + 'x'.repeat(120);
    const result = passwordPolicyValidator(ctrl(long));
    expect(result).toEqual({ maxlength: { requiredLength: 120, actualLength: long.length } });
  });
});
