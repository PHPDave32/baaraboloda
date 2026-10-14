import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { EMPTY } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AccountService } from 'app/core/auth';
import { WorkspaceService } from '../workspace.service';
import Board from './board';

describe('Board assignment dropdown', () => {
  it('moves the open menu outside the clipped board and closes it cleanly', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: EMPTY } },
        { provide: WorkspaceService, useValue: {} },
        { provide: AccountService, useValue: { account: () => ({ login: 'admin' }), hasAnyAuthority: () => true } },
      ],
    });
    TestBed.overrideComponent(Board, {
      set: {
        imports: [NgbDropdownModule],
        template: `<div style="overflow: hidden; width: 100px" ngbDropdown container="body" #dropdown="ngbDropdown"
        (openChange)="!$event && closeAssignMenu()">
        <button ngbDropdownAnchor (click)="toggleAssignMenu({id: 1}, $event, dropdown)">Assign</button>
        <div ngbDropdownMenu data-testid="assignment-options"><button ngbDropdownItem>First person</button><button ngbDropdownItem>Last person</button></div>
      </div>`,
      },
    });
    const fixture = TestBed.createComponent(Board);
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('[data-testid="assignment-options"]') as HTMLElement;
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.assignMenuTaskId()).toBe(1);
    expect(fixture.nativeElement.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
    expect(menu.textContent).toContain('First person');
    expect(menu.textContent).toContain('Last person');
    fixture.componentInstance.closeAssignMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.assignMenuTaskId()).toBeNull();
    expect(fixture.nativeElement.contains(menu)).toBe(true);
    fixture.destroy();
  });
});
