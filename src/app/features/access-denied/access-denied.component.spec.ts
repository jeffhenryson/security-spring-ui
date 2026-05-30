import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AccessDeniedComponent, RouterTestingModule],
    }).overrideTemplate(AccessDeniedComponent, '<p>403</p>'),
  );

  it('cria o componente', () => {
    const fixture = TestBed.createComponent(AccessDeniedComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
