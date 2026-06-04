import { TestBed } from '@angular/core/testing';
import { TotpBackupCodesComponent } from './totp-backup-codes.component';

const CODES = ['abc-123', 'def-456', 'ghi-789'];

describe('TotpBackupCodesComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpBackupCodesComponent] })
      .overrideTemplate(TotpBackupCodesComponent, ''),
  );

  function create(backupCodes = CODES, backupCopied = false) {
    const fixture = TestBed.createComponent(TotpBackupCodesComponent);
    fixture.componentRef.setInput('backupCodes', backupCodes);
    fixture.componentRef.setInput('backupCopied', backupCopied);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('backupCodes() retorna os códigos passados como input', () => {
    expect(create(CODES).backupCodes()).toEqual(CODES);
  });

  it('backupCopied() reflete o estado de cópia', () => {
    expect(create(CODES, true).backupCopied()).toBe(true);
    expect(create(CODES, false).backupCopied()).toBe(false);
  });

  it('backupCodes() retorna array vazio por padrão', () => {
    const fixture = TestBed.createComponent(TotpBackupCodesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.backupCodes()).toEqual([]);
  });
});
