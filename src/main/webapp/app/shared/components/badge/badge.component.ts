import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: ` <span [class]="badgeClass" [style]="badgeStyle">{{ label }}</span> `,
})
export class BadgeComponent {
  @Input() type: 'status' | 'priority' | 'taskType' = 'status';
  @Input() value: string = '';

  get label(): string {
    if (!this.value) return '';
    return this.value.replace('_', ' ');
  }

  get badgeClass(): string {
    return 'badge';
  }

  get badgeStyle(): string {
    if (this.type === 'status') return this.statusStyles[this.value] || this.defaultStyle;
    if (this.type === 'priority') return this.priorityStyles[this.value] || this.defaultStyle;
    if (this.type === 'taskType') return this.typeStyles[this.value] || this.defaultStyle;
    return this.defaultStyle;
  }

  private defaultStyle = 'background-color:#e2e8f0;color:#475569;';

  private statusStyles: Record<string, string> = {
    PLANNED: 'background-color:#e2e8f0;color:#475569;',
    TODO: 'background-color:#e2e8f0;color:#475569;',
    ACTIVE: 'background-color:#d9eef6;color:#1e6f8e;',
    IN_PROGRESS: 'background-color:#d9eef6;color:#1e6f8e;',
    IN_REVIEW: 'background-color:#ede9fe;color:#6d28d9;',
    COMPLETED: 'background-color:#dcfce7;color:#15803d;',
    DONE: 'background-color:#dcfce7;color:#15803d;',
  };

  private priorityStyles: Record<string, string> = {
    LOW: 'background-color:#e2e8f0;color:#475569;',
    MEDIUM: 'background-color:#fef3c7;color:#b45309;',
    HIGH: 'background-color:#ffedd5;color:#c2410c;',
    CRITICAL: 'background-color:#fee2e2;color:#b91c1c;',
  };

  private typeStyles: Record<string, string> = {
    STORY: 'background-color:#d9eef6;color:#1e6f8e;',
    BUG: 'background-color:#fee2e2;color:#b91c1c;',
    TASK: 'background-color:#e2e8f0;color:#475569;',
    EPIC: 'background-color:#ede9fe;color:#6d28d9;',
  };
}
