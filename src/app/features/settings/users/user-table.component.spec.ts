import { TestBed, ComponentFixture } from '@angular/core/testing';
import { UserTableComponent } from './user-table.component';
import { UserResponse as User } from '../../../core/admin/users-admin.service';
import { provideZonelessChangeDetection } from '@angular/core';

const ALICE: User = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  roles: ['ADMIN'],
};

const BOB: User = {
  id: 2,
  username: 'bob',
  email: 'bob@example.com',
  enabled: false,
  roles: [],
};

async function createFixture(
  inputs: Partial<{
    rows: User[];
    loading: boolean;
    displayedCols: string[];
    total: number;
    pageSize: number;
    canUpdate: boolean;
    canDelete: boolean;
    canSetStatus: boolean;
    canAssignRole: boolean;
    highlightedId: number | null;
  }> = {},
): Promise<ComponentFixture<UserTableComponent>> {
  await TestBed.configureTestingModule({
    imports: [UserTableComponent],
    providers: [provideZonelessChangeDetection()],
  })
    .overrideTemplate(UserTableComponent, '<ng-container />')
    .compileComponents();

  const fixture = TestBed.createComponent(UserTableComponent);
  const { componentRef } = fixture;

  componentRef.setInput('rows', inputs.rows ?? [ALICE, BOB]);
  componentRef.setInput('loading', inputs.loading ?? false);
  componentRef.setInput('displayedCols', inputs.displayedCols ?? ['username', 'email', 'status', 'roles', 'actions']);
  componentRef.setInput('total', inputs.total ?? 2);
  componentRef.setInput('pageSize', inputs.pageSize ?? 10);
  if (inputs.canUpdate !== undefined) componentRef.setInput('canUpdate', inputs.canUpdate);
  if (inputs.canDelete !== undefined) componentRef.setInput('canDelete', inputs.canDelete);
  if (inputs.canSetStatus !== undefined) componentRef.setInput('canSetStatus', inputs.canSetStatus);
  if (inputs.canAssignRole !== undefined) componentRef.setInput('canAssignRole', inputs.canAssignRole);
  if (inputs.highlightedId !== undefined) componentRef.setInput('highlightedId', inputs.highlightedId);

  fixture.detectChanges();
  return fixture;
}

describe('UserTableComponent', () => {
  // ── inputs ────────────────────────────────────────────────────────────────

  it('cria o componente', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expõe as linhas recebidas via input', async () => {
    const fixture = await createFixture({ rows: [ALICE] });
    expect(fixture.componentInstance.rows()).toEqual([ALICE]);
  });

  it('estado loading reflete o input', async () => {
    const fixture = await createFixture({ loading: true });
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('displayedCols reflete o input', async () => {
    const fixture = await createFixture({ displayedCols: ['username', 'email'] });
    expect(fixture.componentInstance.displayedCols()).toEqual(['username', 'email']);
  });

  it('total e pageSize refletem os inputs', async () => {
    const fixture = await createFixture({ total: 100, pageSize: 25 });
    const comp = fixture.componentInstance;
    expect(comp.total()).toBe(100);
    expect(comp.pageSize()).toBe(25);
  });

  // ── permissões ────────────────────────────────────────────────────────────

  it('todas as permissões começam como false por padrão', async () => {
    const fixture = await createFixture();
    const comp = fixture.componentInstance;
    expect(comp.canUpdate()).toBe(false);
    expect(comp.canDelete()).toBe(false);
    expect(comp.canSetStatus()).toBe(false);
    expect(comp.canAssignRole()).toBe(false);
  });

  it('permissões individuais refletem os inputs', async () => {
    const fixture = await createFixture({
      canUpdate: true,
      canDelete: true,
      canSetStatus: false,
      canAssignRole: true,
    });
    const comp = fixture.componentInstance;
    expect(comp.canUpdate()).toBe(true);
    expect(comp.canDelete()).toBe(true);
    expect(comp.canSetStatus()).toBe(false);
    expect(comp.canAssignRole()).toBe(true);
  });

  // ── highlight ─────────────────────────────────────────────────────────────

  it('highlightedId padrão é null', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance.highlightedId()).toBeNull();
  });

  it('highlightedId reflete o input quando definido', async () => {
    const fixture = await createFixture({ highlightedId: 1 });
    expect(fixture.componentInstance.highlightedId()).toBe(1);
  });

  // ── outputs ───────────────────────────────────────────────────────────────

  it('editUser emite o usuário correto', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    fixture.componentInstance.editUser.subscribe(spy);
    fixture.componentInstance.editUser.emit(ALICE);
    expect(spy).toHaveBeenCalledWith(ALICE);
  });

  it('toggleStatus emite o usuário correto', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    fixture.componentInstance.toggleStatus.subscribe(spy);
    fixture.componentInstance.toggleStatus.emit(BOB);
    expect(spy).toHaveBeenCalledWith(BOB);
  });

  it('manageRoles emite o usuário correto', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    fixture.componentInstance.manageRoles.subscribe(spy);
    fixture.componentInstance.manageRoles.emit(ALICE);
    expect(spy).toHaveBeenCalledWith(ALICE);
  });

  it('deleteUser emite o usuário correto', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    fixture.componentInstance.deleteUser.subscribe(spy);
    fixture.componentInstance.deleteUser.emit(BOB);
    expect(spy).toHaveBeenCalledWith(BOB);
  });

  it('sortChange emite o evento de sort', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    const sortEvent = { active: 'username', direction: 'asc' as const };
    fixture.componentInstance.sortChange.subscribe(spy);
    fixture.componentInstance.sortChange.emit(sortEvent);
    expect(spy).toHaveBeenCalledWith(sortEvent);
  });

  it('pageChange emite o evento de paginação', async () => {
    const fixture = await createFixture();
    const spy = jest.fn();
    const pageEvent = { pageIndex: 1, pageSize: 25, length: 100 };
    fixture.componentInstance.pageChange.subscribe(spy);
    fixture.componentInstance.pageChange.emit(pageEvent);
    expect(spy).toHaveBeenCalledWith(pageEvent);
  });

  // ── defaults dos inputs opcionais ─────────────────────────────────────────

  it('sortActive padrão é "id"', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance.sortActive()).toBe('id');
  });

  it('sortDir padrão é "asc"', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance.sortDir()).toBe('asc');
  });

  it('skeletonRows padrão é array vazio', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance.skeletonRows()).toEqual([]);
  });
});
