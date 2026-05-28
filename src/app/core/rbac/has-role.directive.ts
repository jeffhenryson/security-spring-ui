import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private role = '';

  @Input() set hasRole(r: string) {
    this.role = r;
  }

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasRole(this.role)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
