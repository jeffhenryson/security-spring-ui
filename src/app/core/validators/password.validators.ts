import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password') ?? control.get('newPassword');
  const confirm = control.get('confirmPassword');
  if (!pw || !confirm) return null;
  return pw.value === confirm.value ? null : { passwordMismatch: true };
}
