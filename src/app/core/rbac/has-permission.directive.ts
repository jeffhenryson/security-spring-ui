import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Directive({ selector: '[hasPermission]', standalone: true })
export class HasPermissionDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private permission = '';

  @Input() set hasPermission(p: string) {
    this.permission = p;
  }

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasPermission(this.permission)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
