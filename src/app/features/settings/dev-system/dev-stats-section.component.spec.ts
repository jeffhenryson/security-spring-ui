import { TestBed } from '@angular/core/testing';
import { DevStatsSectionComponent, DevStats } from './dev-stats-section.component';

const MOCK_STATS: DevStats = { totalUsers: 10, activeUsers: 8, totalRoles: 3, totalPermissions: 20 };

describe('DevStatsSectionComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [DevStatsSectionComponent] })
      .overrideTemplate(DevStatsSectionComponent, ''),
  );

  it('cria o componente sem dados', () => {
    const fixture = TestBed.createComponent(DevStatsSectionComponent);
    fixture.componentRef.setInput('stats', null);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('aceita stats e loading como inputs', () => {
    const fixture = TestBed.createComponent(DevStatsSectionComponent);
    fixture.componentRef.setInput('stats', MOCK_STATS);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.stats()).toEqual(MOCK_STATS);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('loading=true quando stats ainda estão carregando', () => {
    const fixture = TestBed.createComponent(DevStatsSectionComponent);
    fixture.componentRef.setInput('stats', null);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
  });
});
