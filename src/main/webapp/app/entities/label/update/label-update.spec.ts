import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProject } from 'app/entities/project/project.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { ILabel } from '../label.model';
import { LabelService } from '../service/label.service';

import { LabelFormService } from './label-form.service';
import { LabelUpdate } from './label-update';

describe('Label Management Update Component', () => {
  let comp: LabelUpdate;
  let fixture: ComponentFixture<LabelUpdate>;
  let activatedRoute: ActivatedRoute;
  let labelFormService: LabelFormService;
  let labelService: LabelService;
  let projectService: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(LabelUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    labelFormService = TestBed.inject(LabelFormService);
    labelService = TestBed.inject(LabelService);
    projectService = TestBed.inject(ProjectService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Project query and add missing value', () => {
      const label: ILabel = { id: 7351 };
      const project: IProject = { id: 10300 };
      label.project = project;

      const projectCollection: IProject[] = [{ id: 10300 }];
      vi.spyOn(projectService, 'query').mockReturnValue(of(new HttpResponse({ body: projectCollection })));
      const additionalProjects = [project];
      const expectedCollection: IProject[] = [...additionalProjects, ...projectCollection];
      vi.spyOn(projectService, 'addProjectToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ label });
      comp.ngOnInit();

      expect(projectService.query).toHaveBeenCalled();
      expect(projectService.addProjectToCollectionIfMissing).toHaveBeenCalledWith(
        projectCollection,
        ...additionalProjects.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.projectsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const label: ILabel = { id: 7351 };
      const project: IProject = { id: 10300 };
      label.project = project;

      activatedRoute.data = of({ label });
      comp.ngOnInit();

      expect(comp.projectsSharedCollection()).toContainEqual(project);
      expect(comp.label).toEqual(label);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ILabel>();
      const label = { id: 4199 };
      vi.spyOn(labelFormService, 'getLabel').mockReturnValue(label);
      vi.spyOn(labelService, 'update').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ label });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(label);
      saveSubject.complete();

      // THEN
      expect(labelFormService.getLabel).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(labelService.update).toHaveBeenCalledWith(expect.objectContaining(label));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ILabel>();
      const label = { id: 4199 };
      vi.spyOn(labelFormService, 'getLabel').mockReturnValue({ id: null });
      vi.spyOn(labelService, 'create').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ label: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(label);
      saveSubject.complete();

      // THEN
      expect(labelFormService.getLabel).toHaveBeenCalled();
      expect(labelService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ILabel>();
      const label = { id: 4199 };
      vi.spyOn(labelService, 'update').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ label });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(labelService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareProject', () => {
      it('should forward to projectService', () => {
        const entity = { id: 10300 };
        const entity2 = { id: 3319 };
        vi.spyOn(projectService, 'compareProject');
        comp.compareProject(entity, entity2);
        expect(projectService.compareProject).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
