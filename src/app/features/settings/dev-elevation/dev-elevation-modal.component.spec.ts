import { TestBed } from '@angular/core/testing';
import { DevElevationModalComponent } from './dev-elevation-modal.component';
import { DevService } from '../../../core/dev/dev.service';
import { AuthStore } from '../../../core/auth/auth.store';

function makeDevService() {
  return {
    firstCode: jest.fn(),
    complete: jest.fn(),
  } as unknown as jest.Mocked<DevService>;
}

function makeStore() {
  return {
    setDevToken: jest.fn(),
  } as unknown as jest.Mocked<AuthStore>;
}

describe('DevElevationModalComponent', () => {
  let component: DevElevationModalComponent;
  let devService: jest.Mocked<DevService>;
  let store: jest.Mocked<AuthStore>;

  beforeEach(async () => {
    devService = makeDevService();
    store = makeStore();

    await TestBed.configureTestingModule({
      imports: [DevElevationModalComponent],
      providers: [
        { provide: DevService, useValue: devService },
        { provide: AuthStore, useValue: store },
      ],
    })
      .overrideTemplate(DevElevationModalComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(DevElevationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia no step1 com campos vazios', () => {
    expect(component.step()).toBe('step1');
    expect(component.code1()).toBe('');
    expect(component.code2()).toBe('');
    expect(component.error()).toBe('');
  });

  describe('submitStep1', () => {
    it('não avança com código menor que 6 dígitos', async () => {
      component.code1.set('1234');
      await component.submitStep1();
      expect(devService.firstCode).not.toHaveBeenCalled();
      expect(component.step()).toBe('step1');
    });

    it('avança para step2 após firstCode bem-sucedido', async () => {
      devService.firstCode.mockResolvedValue({ devToken: 'tok-abc', expiresIn: 90 });
      component.code1.set('123456');
      await component.submitStep1();
      expect(component.step()).toBe('step2');
      expect(component.devToken()).toBe('tok-abc');
      expect(component.step2SecondsLeft()).toBe(90);
    });

    it('exibe erro e permanece em step1 quando firstCode rejeita', async () => {
      devService.firstCode.mockRejectedValue(new Error('invalid'));
      component.code1.set('000000');
      await component.submitStep1();
      expect(component.step()).toBe('step1');
      expect(component.error()).toContain('Código inválido');
    });
  });

  describe('submitStep2', () => {
    beforeEach(async () => {
      devService.firstCode.mockResolvedValue({ devToken: 'tok-abc', expiresIn: 90 });
      component.code1.set('123456');
      await component.submitStep1();
    });

    it('não conclui com código menor que 6 dígitos', async () => {
      component.code2.set('4321');
      await component.submitStep2();
      expect(devService.complete).not.toHaveBeenCalled();
    });

    it('chama store.setDevToken e emite elevated após sucesso', async () => {
      const elevatedSpy = jest.fn();
      component.elevated.subscribe(elevatedSpy);
      devService.complete.mockResolvedValue({ accessToken: 'dev-tok', expiresIn: 3600 });

      component.code2.set('654321');
      await component.submitStep2();

      expect(store.setDevToken).toHaveBeenCalledWith('dev-tok', 3600);
      expect(elevatedSpy).toHaveBeenCalled();
    });

    it('exibe erro e limpa code2 quando complete rejeita', async () => {
      devService.complete.mockRejectedValue(new Error('not consecutive'));
      component.code2.set('111111');
      await component.submitStep2();

      expect(component.error()).toContain('inválido');
      expect(component.code2()).toBe('');
    });
  });

  describe('reset', () => {
    it('volta ao estado inicial', async () => {
      devService.firstCode.mockResolvedValue({ devToken: 'tok', expiresIn: 90 });
      component.code1.set('123456');
      await component.submitStep1();
      expect(component.step()).toBe('step2');

      component.reset();

      expect(component.step()).toBe('step1');
      expect(component.code1()).toBe('');
      expect(component.code2()).toBe('');
      expect(component.error()).toBe('');
    });
  });

  describe('step2Expired', () => {
    it('é false quando timer > 0', async () => {
      devService.firstCode.mockResolvedValue({ devToken: 'tok', expiresIn: 90 });
      component.code1.set('123456');
      await component.submitStep1();
      expect(component.step2Expired()).toBe(false);
    });

    it('é true quando step2SecondsLeft chega a 0', async () => {
      devService.firstCode.mockResolvedValue({ devToken: 'tok', expiresIn: 90 });
      component.code1.set('123456');
      await component.submitStep1();
      component.step2SecondsLeft.set(0);
      expect(component.step2Expired()).toBe(true);
    });
  });
});
