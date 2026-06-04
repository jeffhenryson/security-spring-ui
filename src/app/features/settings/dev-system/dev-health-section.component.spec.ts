import { TestBed } from '@angular/core/testing';
import { DevHealthSectionComponent } from './dev-health-section.component';
import { HealthStatus } from '../../../core/dev/dev.service';

const HEALTH_UP: HealthStatus = {
  status: 'UP',
  components: { db: { status: 'UP' }, disk: { status: 'UP' } },
};

const HEALTH_DOWN: HealthStatus = { status: 'DOWN', components: {} };

describe('DevHealthSectionComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [DevHealthSectionComponent] })
      .overrideTemplate(DevHealthSectionComponent, ''),
  );

  function create(health: HealthStatus | null, loading = false) {
    const fixture = TestBed.createComponent(DevHealthSectionComponent);
    fixture.componentRef.setInput('health', health);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('updatedAt', '');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create(null)).toBeTruthy();
  });

  it('healthComponents() retorna lista de componentes mapeados', () => {
    const c = create(HEALTH_UP);
    const components = c.healthComponents();
    expect(components).toHaveLength(2);
    expect(components).toContainEqual({ name: 'db', status: 'UP' });
    expect(components).toContainEqual({ name: 'disk', status: 'UP' });
  });

  it('healthComponents() retorna array vazio quando health é null', () => {
    const c = create(null);
    expect(c.healthComponents()).toEqual([]);
  });

  it('healthComponents() retorna array vazio quando components está ausente', () => {
    const c = create(HEALTH_DOWN);
    expect(c.healthComponents()).toEqual([]);
  });

  it('healthComponents() é computed — não recalcula sem mudança de input', () => {
    const c = create(HEALTH_UP);
    const first = c.healthComponents();
    const second = c.healthComponents();
    expect(first).toBe(second);
  });
});
