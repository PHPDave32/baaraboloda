import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IProject } from 'app/entities/project/project.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { UserService } from 'app/entities/user/service/user.service';
import { IUser } from 'app/entities/user/user.model';
import { SprintService } from '../service/sprint.service';
import { ISprint } from '../sprint.model';

import { SprintFormService } from './sprint-form.service';
import { SprintUpdate } from './sprint-update';

describe('Sprint Management Update Component', () => {
  let comp: SprintUpdate;
  let fixture: ComponentFixture<SprintUpdate>;
  let activatedRoute: ActivatedRoute;
  let sprintFormService: SprintFormService;
  let sprintService: SprintService;
  let userService: UserService;
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

    fixture = TestBed.createComponent(SprintUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    sprintFormService = TestBed.inject(SprintFormService);
    sprintService = TestBed.inject(SprintService);
    userService = TestBed.inject(UserService);
    projectService = TestBed.inject(ProjectService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call User query and add missing value', () => {
      const sprint: ISprint = { id: 28936 };
      const createdBy: IUser = { id: 3944 };
      sprint.createdBy = createdBy;

      const userCollection: IUser[] = [{ id: 3944 }];
      vi.spyOn(userService, 'query').mockReturnValue(of(new HttpResponse({ body: userCollection })));
      const additionalUsers = [createdBy];
      const expectedCollection: IUser[] = [...additionalUsers, ...userCollection];
      vi.spyOn(userService, 'addUserToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ sprint });
      comp.ngOnInit();

      expect(userService.query).toHaveBeenCalled();
      expect(userService.addUserToCollectionIfMissing).toHaveBeenCalledWith(
        userCollection,
        ...additionalUsers.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.usersSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Project query and add missing value', () => {
      const sprint: ISprint = { id: 28936 };
      const project: IProject = { id: 10300 };
      sprint.project = project;

      const projectCollection: IProject[] = [{ id: 10300 }];
      vi.spyOn(projectService, 'query').mockReturnValue(of(new HttpResponse({ body: projectCollection })));
      const additionalProjects = [project];
      const expectedCollection: IProject[] = [...additionalProjects, ...projectCollection];
      vi.spyOn(projectService, 'addProjectToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ sprint });
      comp.ngOnInit();

      expect(projectService.query).toHaveBeenCalled();
      expect(projectService.addProjectToCollectionIfMissing).toHaveBeenCalledWith(
        projectCollection,
        ...additionalProjects.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.projectsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const sprint: ISprint = { id: 28936 };
      const createdBy: IUser = { id: 3944 };
      sprint.createdBy = createdBy;
      const project: IProject = { id: 10300 };
      sprint.project = project;

      activatedRoute.data = of({ sprint });
      comp.ngOnInit();

      expect(comp.usersSharedCollection()).toContainEqual(createdBy);
      expect(comp.projectsSharedCollection()).toContainEqual(project);
      expect(comp.sprint).toEqual(sprint);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ISprint>();
      const sprint = { id: 19154 };
      vi.spyOn(sprintFormService, 'getSprint').mockReturnValue(sprint);
      vi.spyOn(sprintService, 'update').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ sprint });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(sprint);
      saveSubject.complete();

      // THEN
      expect(sprintFormService.getSprint).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(sprintService.update).toHaveBeenCalledWith(expect.objectContaining(sprint));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ISprint>();
      const sprint = { id: 19154 };
      vi.spyOn(sprintFormService, 'getSprint').mockReturnValue({ id: null });
      vi.spyOn(sprintService, 'create').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ sprint: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(sprint);
      saveSubject.complete();

      // THEN
      expect(sprintFormService.getSprint).toHaveBeenCalled();
      expect(sprintService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ISprint>();
      const sprint = { id: 19154 };
      vi.spyOn(sprintService, 'update').mockReturnValue(saveSubject);
      vi.spyOn(comp, 'previousState');
      activatedRoute.data = of({ sprint });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(sprintService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareUser', () => {
      it('should forward to userService', () => {
        const entity = { id: 3944 };
        const entity2 = { id: 6275 };
        vi.spyOn(userService, 'compareUser');
        comp.compareUser(entity, entity2);
        expect(userService.compareUser).toHaveBeenCalledWith(entity, entity2);
      });
    });

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
