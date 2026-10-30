import { readFileSync } from 'node:fs';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from 'app/core/auth';
import { TaskService } from 'app/entities/task/service/task.service';
import { ToastService } from 'app/shared/toast/toast.service';
import { PlanningService } from '../planning.service';
import Backlog from './backlog';

const project = { id: 42, uuid: '550e8400-e29b-41d4-a716-446655440000', name: 'Test', status: 'ACTIVE', memberses: [] };

describe('Backlog creation buttons', () => {
  let fixture: ComponentFixture<Backlog>;
  let component: Backlog;
  const createTask = vi.fn();
  const createSprint = vi.fn();
  let getBacklog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createTask.mockReset().mockReturnValue(new Subject());
    createSprint.mockReset().mockReturnValue(new Subject());
    getBacklog = vi.fn().mockReturnValue(of([]));
    // Render the actual creation windows, without the unrelated notification center and task lists.
    const html = readFileSync(`${process.cwd()}/src/main/webapp/app/features/projects/backlog/backlog.html`, 'utf8');
    const modals = html.match(/<app-modal\s+appearance="editor"[\s\S]*?<\/app-modal>/g)!;
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ workspace: { projectId: 42 } }) } },
        { provide: AccountService, useValue: { account: () => ({ login: 'owner' }), hasAnyAuthority: () => true } },
        { provide: TaskService, useValue: {} },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        {
          provide: PlanningService,
          useValue: { getProject: () => of(project), getBacklog, getSprints: () => of([]), createTask, createSprint },
        },
      ],
    }).overrideComponent(Backlog, { set: { template: modals.join('\n') } });
    fixture = TestBed.createComponent(Backlog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function clickCreate(): void {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.modal-btn-primary') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
  }

  it('submits a valid task from the actual confirmation button with the numeric project relation', () => {
    component.openTaskForm();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('#new-task-title') as HTMLInputElement;
    title.value = 'Nouvelle tâche';
    title.dispatchEvent(new Event('input'));
    clickCreate();
    expect(createTask).toHaveBeenCalledWith(42, 'owner', expect.objectContaining({ title: 'Nouvelle tâche', sprintId: null }));
  });

  it('submits a valid sprint from the actual confirmation button', () => {
    component.openSprintForm();
    component.sprintForm.patchValue({ name: 'Sprint test', startDate: '2030-01-01', endDate: '2030-01-15' });
    clickCreate();
    expect(createSprint).toHaveBeenCalledWith(42, expect.objectContaining({ name: 'Sprint test' }));
  });

  it('shows a visible validation message instead of silently ignoring an incomplete task', () => {
    component.openTaskForm();
    clickCreate();
    expect(createTask).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('titre');
    expect(component.taskForm.controls.title.touched).toBe(true);
  });

  it('shows sprint validation errors inside the window', () => {
    component.openSprintForm();
    clickCreate();
    expect(createSprint).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('dates');
  });

  it('does not block creation while the list is loading and prevents duplicate submissions', () => {
    component.loading = true;
    component.openTaskForm();
    component.taskForm.patchValue({ title: 'Nouvelle tâche' });
    clickCreate();
    component.submitTask();
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it('releases the loading state when the backlog request fails', () => {
    getBacklog.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.loadAll();
    expect(component.loading).toBe(false);
    expect(component.error).toContain('charger la liste des tâches');
  });
});
