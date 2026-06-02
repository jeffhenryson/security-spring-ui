import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Directive({ selector: '[hasPermission]', standalone: true })
export class HasPermissionDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  readonly hasPermission = input<string>('');

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasPermission(this.hasPermission())) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
