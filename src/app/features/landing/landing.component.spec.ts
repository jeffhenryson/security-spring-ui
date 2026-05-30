import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [LandingComponent, RouterTestingModule],
    }).overrideTemplate(LandingComponent, ''),
  );

  it('cria o componente', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('expõe as 6 features', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    expect(fixture.componentInstance.features).toHaveLength(6);
  });

  it('expõe os 8 badges de tecnologia', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    expect(fixture.componentInstance.badges).toHaveLength(8);
  });
});
