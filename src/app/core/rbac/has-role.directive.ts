import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  readonly hasRole = input<string>('');

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasRole(this.hasRole())) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
