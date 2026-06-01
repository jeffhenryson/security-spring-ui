import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SecurityComponent } from './security.component';
import { AuthService } from '../../../core/auth/auth.service';
import { SecurityService } from '../../../core/security/security.service';

describe('SecurityComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityComponent],
      providers: [
        { provide: SecurityService, useValue: { loadSessions: jest.fn().mockResolvedValue([]) } },
        { provide: AuthService, useValue: { loadCurrentUser: jest.fn() } },
        { provide: MatSnackBar, useValue: { open: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn(), url: '/' } },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    })
      .overrideTemplate(SecurityComponent, '')
      .compileComponents();
  });

  it('cria o componente shell', () => {
    const fixture = TestBed.createComponent(SecurityComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
