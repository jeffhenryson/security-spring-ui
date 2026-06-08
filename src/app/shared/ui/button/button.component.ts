import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ButtonVariant = 'contained' | 'outlined' | 'texted' | 'split' | 'icon' | 'icon-circle';

@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'contained';
  @Input() disabled = false;
  @Input() processing = false;
  @Input() danger = false;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() type: 'button' | 'submit' = 'button';
  @Output() clicked = new EventEmitter<void>();

  get isDisabled(): boolean {
    return this.disabled || this.processing;
  }

  handleClick(): void {
    if (!this.isDisabled) this.clicked.emit();
  }
}
