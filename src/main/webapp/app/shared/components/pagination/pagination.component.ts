import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageCount = 1;

  @Output() pageChange = new EventEmitter<number>();

  go(page: number): void {
    const target = Math.min(Math.max(1, page), this.pageCount);
    if (target !== this.page) {
      this.pageChange.emit(target);
    }
  }
}
