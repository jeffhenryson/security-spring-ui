import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

function setup(data: ConfirmDialogData) {
  TestBed.configureTestingModule({
    imports: [ConfirmDialogComponent],
    providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
  }).overrideTemplate(ConfirmDialogComponent, '');
  const fixture = TestBed.createComponent(ConfirmDialogComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('ConfirmDialogComponent', () => {
  it('expõe os dados injetados via data', () => {
    const component = setup({ title: 'Excluir', message: 'Tem certeza?' });
    expect(component.data.title).toBe('Excluir');
    expect(component.data.message).toBe('Tem certeza?');
  });

  it('confirmLabel padrão é undefined quando não fornecido', () => {
    const component = setup({ title: 'Confirmar', message: 'Prosseguir?' });
    expect(component.data.confirmLabel).toBeUndefined();
  });

  it('confirmLabel recebe valor customizado', () => {
    const component = setup({ title: 'Apagar', message: 'Apagar dados?', confirmLabel: 'Apagar' });
    expect(component.data.confirmLabel).toBe('Apagar');
  });

  it('danger flag é passado corretamente', () => {
    const component = setup({ title: 'Deletar', message: 'Deletar conta?', danger: true });
    expect(component.data.danger).toBe(true);
  });

  it('danger é undefined quando não fornecido', () => {
    const component = setup({ title: 'OK', message: 'Continuar?' });
    expect(component.data.danger).toBeUndefined();
  });
});
