import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AccessDeniedComponent],
      providers: [provideRouter([])],
    }).overrideTemplate(AccessDeniedComponent, '<p>403</p>'),
  );

  it('cria o componente', () => {
    const fixture = TestBed.createComponent(AccessDeniedComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
