import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [NotFoundComponent, RouterTestingModule],
    }).overrideTemplate(NotFoundComponent, '<p>404</p>'),
  );

  it('cria o componente', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
