import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DevSystemComponent } from './dev-system.component';
import { StatsService } from '../../../core/admin/stats.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const MOCK_HEALTH = { status: 'UP', components: { db: { status: 'UP' } } };
const MOCK_STATS = { totalUsers: 10, activeUsers: 8, totalRoles: 2, totalPermissions: 15 };

describe('DevSystemComponent', () => {
  let component: DevSystemComponent;
  let controller: HttpTestingController;
  let statsService: jest.Mocked<StatsService>;

  beforeEach(async () => {
    statsService = { get: jest.fn().mockResolvedValue(MOCK_STATS) } as unknown as jest.Mocked<StatsService>;

    await TestBed.configureTestingModule({
      imports: [DevSystemComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StatsService, useValue: statsService },
      ],
    })
      .overrideTemplate(DevSystemComponent, '')
      .compileComponents();

    controller = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DevSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Drena requests abertos pelo ngOnInit para não contaminar testes seguintes
    controller.match(`${API}/actuator/health`);
  });

  afterEach(() => controller.verify());

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('chama statsService.get no ngOnInit', () => {
    expect(statsService.get).toHaveBeenCalled();
  });

  it('seta health corretamente após resposta bem-sucedida', async () => {
    component.refresh();
    controller.expectOne(`${API}/actuator/health`).flush(MOCK_HEALTH);
    await Promise.resolve();
    expect(component.health()).toEqual(MOCK_HEALTH);
  });

  it('seta health como null em caso de erro', async () => {
    component.refresh();
    controller
      .expectOne(`${API}/actuator/health`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    expect(component.health()).toBeNull();
  });

  it('exibe URL da API corretamente', () => {
    expect(component.apiUrl).toBe(API);
  });
});
