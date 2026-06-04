import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SystemConfigComponent } from './system-config.component';
import { AppConfigService } from '../../../core/config/app-config.service';
import { AppConfigStore } from '../../../core/config/app-config.store';

function makeConfigService() {
  return {
    loadAll: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AppConfigService>;
}

describe('SystemConfigComponent', () => {
  let component: SystemConfigComponent;
  let configService: jest.Mocked<AppConfigService>;
  let store: AppConfigStore;
  let snackBar: { open: jest.Mock };

  beforeEach(async () => {
    configService = makeConfigService();
    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SystemConfigComponent],
      providers: [
        { provide: AppConfigService, useValue: configService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(SystemConfigComponent, '')
      .compileComponents();

    store = TestBed.inject(AppConfigStore);
    const fixture = TestBed.createComponent(SystemConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('carrega configurações no ngOnInit', () => {
    expect(configService.loadAll).toHaveBeenCalled();
  });

  it('groupedItems() retorna grupos únicos sem duplicatas', () => {
    const groups = component.groupedItems().map((g) => g.group);
    expect(groups.length).toBeGreaterThan(0);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('groupedItems() inclui todos os items de cada grupo', () => {
    const all = component.groupedItems().flatMap((g) => g.items);
    expect(all.length).toBeGreaterThan(0);
    all.forEach((item) => {
      expect(item.key).toBeTruthy();
      expect(item.label).toBeTruthy();
    });
  });

  it('hasPending é false no início', () => {
    expect(component.hasPending()).toBe(false);
    expect(component.pendingCount()).toBe(0);
  });

  it('markPending() marca item como pendente em groupedItems()', () => {
    store.setConfig({ 'auth.google.enabled': 'true' });
    component.markPending('auth.google.enabled', false);
    expect(component.hasPending()).toBe(true);
    const item = component.groupedItems()
      .flatMap((g) => g.items)
      .find((i) => i.key === 'auth.google.enabled')!;
    expect(item.isPending).toBe(true);
    expect(item.value).toBe(false);
  });

  it('markPending() remove pendente quando valor é revertido', () => {
    store.setConfig({ 'auth.google.enabled': 'true' });
    component.markPending('auth.google.enabled', false);
    component.markPending('auth.google.enabled', true);
    expect(component.hasPending()).toBe(false);
  });

  it('groupedItems() usa valor da store quando não há pendente', () => {
    store.setConfig({ 'security.maintenance.enabled': 'false' });
    const item = component.groupedItems()
      .flatMap((g) => g.items)
      .find((i) => i.key === 'security.maintenance.enabled')!;
    expect(item.isPending).toBe(false);
    expect(item.value).toBe(false);
  });

  it('applyAll() chama configService.set para cada pendente', async () => {
    store.setConfig({ 'auth.google.enabled': 'true', 'auth.registration.enabled': 'true' });
    component.markPending('auth.google.enabled', false);
    component.markPending('auth.registration.enabled', false);
    await component.applyAll();
    expect(configService.set).toHaveBeenCalledTimes(2);
    expect(component.hasPending()).toBe(false);
  });

  it('applyAll() exibe erro quando serviço falha', async () => {
    store.setConfig({ 'auth.google.enabled': 'true' });
    component.markPending('auth.google.enabled', false);
    configService.set.mockRejectedValueOnce(new Error('fail'));
    await component.applyAll();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Erro ao aplicar configurações.',
      'Fechar',
      expect.any(Object),
    );
  });

  it('loadError é true quando loadAll falha', async () => {
    configService.loadAll.mockRejectedValueOnce(new Error('fail'));
    await component.reload();
    expect(component.loadError()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});
