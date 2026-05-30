import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  function setup(message: string, icon?: string) {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).overrideTemplate(EmptyStateComponent, `<p>{{message()}}</p><span>{{icon()}}</span>`);
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', message);
    if (icon) fixture.componentRef.setInput('icon', icon);
    fixture.detectChanges();
    return fixture;
  }

  it('exibe a mensagem passada via input', () => {
    const fixture = setup('Nenhum item encontrado.');
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Nenhum item encontrado.');
  });

  it('usa "inbox" como ícone padrão', () => {
    const fixture = setup('Vazio');
    expect(fixture.componentInstance.icon()).toBe('inbox');
  });

  it('usa o ícone informado quando passado', () => {
    const fixture = setup('Sem roles', 'admin_panel_settings');
    expect(fixture.componentInstance.icon()).toBe('admin_panel_settings');
  });
});
