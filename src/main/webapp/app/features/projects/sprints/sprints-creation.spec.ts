import { readFileSync } from 'node:fs';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from 'app/shared/toast/toast.service';
import { PlanningService } from '../planning.service';
import Sprints from './sprints';

describe('Sprint creation buttons', () => {
  let fixture: ComponentFixture<Sprints>;
  let component: Sprints;
  const createSprint = vi.fn();
  beforeEach(() => {
    createSprint.mockReset().mockReturnValue(new Subject());
    const html = readFileSync(`${process.cwd()}/src/main/webapp/app/features/projects/sprints/sprints.html`, 'utf8');
    const modal = html.match(/<app-modal\s+appearance="editor"[\s\S]*?<\/app-modal>/)![0];
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ workspace: { projectId: 42 } }) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: PlanningService, useValue: { getProject: () => of({ id: 42, name: 'Test' }), getSprints: () => of([]), createSprint } },
      ],
    }).overrideComponent(Sprints, { set: { template: modal } });
    fixture = TestBed.createComponent(Sprints);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.openCreateForm();
  });

  function clickCreate(): void {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.modal-btn-primary') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
  }

  it('shows an explanation when the form is incomplete', () => {
    clickCreate();
    expect(createSprint).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('dates');
  });

  it('creates a valid sprint even while the sprint list is loading', () => {
    component.loading = true;
    component.form.patchValue({ name: 'Nouveau sprint', startDate: '2030-01-01', endDate: '2030-01-15' });
    clickCreate();
    expect(createSprint).toHaveBeenCalledWith(42, expect.objectContaining({ name: 'Nouveau sprint' }));
    component.onSubmit();
    expect(createSprint).toHaveBeenCalledTimes(1);
  });

  it('allows retrying after a failed creation', () => {
    createSprint.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.form.patchValue({ name: 'Nouveau sprint', startDate: '2030-01-01', endDate: '2030-01-15' });
    clickCreate();
    expect(component.saving).toBe(false);
    expect(component.showForm).toBe(true);
    clickCreate();
    expect(createSprint).toHaveBeenCalledTimes(2);
  });
});
