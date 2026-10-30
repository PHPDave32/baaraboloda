import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountService } from 'app/core/auth';
import { IProject } from '../project.model';
import { ProjectService } from '../service/project.service';

import { Project } from './project';

const project = (id: number, name: string, projectKey = ''): IProject => ({ id, name, projectKey }) as IProject;

describe('Project list component', () => {
  let fixture: ComponentFixture<Project>;
  let comp: Project;
  const projectService = {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
  };
  const hasAnyAuthority = vi.fn();

  beforeEach(() => {
    Object.values(projectService).forEach(fn => fn.mockReset());
    projectService.query.mockReturnValue(of(new HttpResponse({ body: [] })));
    hasAnyAuthority.mockReset().mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: AccountService, useValue: { hasAnyAuthority } },
      ],
    }).overrideComponent(Project, { set: { template: '' } });
    fixture = TestBed.createComponent(Project);
    comp = fixture.componentInstance;
  });

  it('loads all projects on init', () => {
    projectService.query.mockReturnValue(of(new HttpResponse({ body: [project(1, 'Alpha')] })));

    comp.ngOnInit();

    expect(projectService.query).toHaveBeenCalledWith({ size: 1000 });
    expect(comp.projects()).toEqual([project(1, 'Alpha')]);
    expect(comp.loading()).toBe(false);
  });

  it('shows an error when projects cannot be loaded', () => {
    projectService.query.mockReturnValue(throwError(() => new Error('down')));

    comp.load();

    expect(comp.error()).toContain('pas pu être chargés');
    expect(comp.loading()).toBe(false);
  });

  it('filters by name or key and resets to the first page', () => {
    comp.projects.set([project(1, 'Alpha', 'ALP'), project(2, 'Beta', 'BET')]);
    comp.page.set(2);

    comp.onSearch('bet');

    expect(comp.filteredProjects().map(p => p.id)).toEqual([2]);
    expect(comp.page()).toBe(1);
  });

  it('paginates by nine and clamps the requested page', () => {
    comp.projects.set(Array.from({ length: 10 }, (_, i) => project(i + 1, `P${i + 1}`)));

    expect(comp.pageCount()).toBe(2);
    comp.goToPage(5);
    expect(comp.page()).toBe(2);
    expect(comp.pagedProjects().map(p => p.id)).toEqual([10]);
  });

  it('creates a project with a generated key and reloads the list', () => {
    projectService.create.mockReturnValue(of({}));
    comp.openCreate();
    comp.form.patchValue({ name: 'Équipe Mobile' });

    comp.save();

    expect(projectService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Équipe Mobile', projectKey: 'EQUIPE', status: 'ACTIVE' }),
    );
    expect(comp.showForm()).toBe(false);
    expect(projectService.query).toHaveBeenCalled();
  });

  it('does not submit an invalid form', () => {
    comp.openCreate();

    comp.save();

    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('explains a forbidden creation instead of a generic error', () => {
    projectService.create.mockReturnValue(throwError(() => ({ status: 403 })));
    comp.openCreate();
    comp.form.patchValue({ name: 'Interdit' });

    comp.save();

    expect(comp.accessDenied()).toBe(true);
    expect(comp.accessDeniedMessage()).toContain('créer un projet');
  });

  it('updates the project being edited', () => {
    projectService.update.mockReturnValue(of({}));
    comp.openEdit(project(7, 'Ancien', 'ANC'));
    comp.form.patchValue({ name: 'Nouveau' });

    comp.save();

    expect(projectService.update).toHaveBeenCalledWith(expect.objectContaining({ id: 7, name: 'Nouveau', projectKey: 'ANC' }));
  });

  it('deletes the selected project after confirmation', () => {
    projectService.delete.mockReturnValue(of(undefined));
    comp.openDeleteModal(project(3, 'À supprimer'));

    comp.confirmDelete();

    expect(projectService.delete).toHaveBeenCalledWith(3);
    expect(comp.projectToDelete()).toBeNull();
  });

  it('explains why a project with children cannot be deleted', () => {
    projectService.delete.mockReturnValue(throwError(() => ({ status: 400, error: { message: 'error.projecthaschildren' } })));
    comp.openDeleteModal(project(3, 'Plein'));

    comp.confirmDelete();

    expect(comp.accessDeniedTitle()).toBe('Suppression impossible');
    expect(comp.accessDeniedMessage()).toContain('tâches ou des périodes');
  });

  it('derives actions from the user permissions', () => {
    hasAnyAuthority.mockImplementation((authorities: string[]) => authorities.includes('PERM_PROJECT_CLOSE'));

    expect(comp.canCloseProject).toBe(true);
    expect(comp.canDeleteProject).toBe(false);
  });
});
