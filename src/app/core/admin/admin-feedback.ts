import { MatSnackBar } from '@angular/material/snack-bar';

export async function runWithFeedback<T>(
  fn: () => Promise<T>,
  okMessage: string,
  errMessage: string | ((err: unknown) => string),
  snackBar: MatSnackBar,
): Promise<T | null> {
  try {
    const result = await fn();
    snackBar.open(okMessage, 'OK', { duration: 3000 });
    return result;
  } catch (err) {
    const msg = typeof errMessage === 'function' ? errMessage(err) : errMessage;
    snackBar.open(msg, 'OK', { duration: 3000 });
    return null;
  }
}

/** Resolve mensagem de erro com tratamento de conflito (409). */
export function httpErrMsg(conflictMsg: string, genericMsg: string): (err: unknown) => string {
  return (err: unknown) =>
    (err as { status?: number })?.status === 409 ? conflictMsg : genericMsg;
}
