import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password') ?? control.get('newPassword');
  const confirm = control.get('confirmPassword');
  if (!pw || !confirm) return null;
  return pw.value === confirm.value ? null : { passwordMismatch: true };
}

// Mesma política do backend: min 8, max 120, 1 maiúscula, 1 minúscula, 1 dígito, 1 especial.
const POLICY_REGEXP = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  if (value.length < 8) return { minlength: { requiredLength: 8, actualLength: value.length } };
  if (value.length > 120) return { maxlength: { requiredLength: 120, actualLength: value.length } };
  if (!POLICY_REGEXP.test(value)) return { passwordPolicy: true };
  return null;
}
