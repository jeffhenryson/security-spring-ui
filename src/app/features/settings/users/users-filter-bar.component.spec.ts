import { TestBed } from '@angular/core/testing';
import { UsersFilterBarComponent } from './users-filter-bar.component';

describe('UsersFilterBarComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [UsersFilterBarComponent] })
      .overrideTemplate(UsersFilterBarComponent, ''),
  );

  afterEach(() => jest.useRealTimers());

  function create() {
    const fixture = TestBed.createComponent(UsersFilterBarComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('controles iniciam com valores vazios', () => {
    const c = create();
    expect(c.searchControl.value).toBe('');
    expect(c.statusControl.value).toBe('');
  });

  it('emite filterChange ao mudar status (sem debounce)', () => {
    jest.useFakeTimers();
    const c = create();
    const spy = jest.spyOn(c.filterChange, 'emit');
    c.statusControl.setValue('active');
    jest.runAllTimers();
    expect(spy).toHaveBeenCalledWith({ search: '', status: 'active' });
  });

  it('emite filterChange com search após debounce de 300ms', () => {
    jest.useFakeTimers();
    const c = create();
    const spy = jest.spyOn(c.filterChange, 'emit');
    c.searchControl.setValue('alice');
    jest.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledWith({ search: 'alice', status: '' });
  });

  it('não emite search antes do debounce', () => {
    jest.useFakeTimers();
    const c = create();
    const spy = jest.spyOn(c.filterChange, 'emit');
    c.searchControl.setValue('a');
    jest.advanceTimersByTime(100);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('trim() remove espaços do search no emit', () => {
    jest.useFakeTimers();
    const c = create();
    const spy = jest.spyOn(c.filterChange, 'emit');
    c.searchControl.setValue('  bob  ');
    jest.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledWith({ search: 'bob', status: '' });
  });
});
