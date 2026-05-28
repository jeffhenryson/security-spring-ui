import { MatSnackBar } from '@angular/material/snack-bar';

export async function runWithFeedback<T>(
  fn: () => Promise<T>,
  okMessage: string,
  errMessage: string,
  snackBar: MatSnackBar,
): Promise<T | null> {
  try {
    const result = await fn();
    snackBar.open(okMessage, 'OK', { duration: 3000 });
    return result;
  } catch {
    snackBar.open(errMessage, 'OK', { duration: 3000 });
    return null;
  }
}
