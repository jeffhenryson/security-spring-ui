import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TotpComponent } from './totp/totp.component';
import { SessionsComponent } from './sessions/sessions.component';

@Component({
  selector: 'app-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TotpComponent, SessionsComponent],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <app-totp />
      <app-sessions />
    </div>
  `,
})
export class SecurityComponent {}
