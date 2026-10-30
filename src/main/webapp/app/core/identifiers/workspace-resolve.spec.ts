import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RedirectCommand, Router, RouterStateSnapshot, convertToParamMap, provideRouter } from '@angular/router';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { serverApiUrl } from 'app/config';
import { WorkspaceIdentifiers, workspaceResolve } from './workspace-resolve';

const projectUuid = '550e8400-e29b-41d4-a716-446655440000';
const taskUuid = '7f90d722-dfa9-40fe-b654-37260f437309';

describe('Workspace UUID routing', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  function resolve(id: string, taskId: string | null, url: string): Observable<WorkspaceIdentifiers | RedirectCommand> {
    const route = { paramMap: convertToParamMap({ id, ...(taskId ? { taskId } : {}) }) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => workspaceResolve(route, { url } as RouterStateSnapshot)) as Observable<
      WorkspaceIdentifiers | RedirectCommand
    >;
  }

  it('opens a UUID deep link and provides internal IDs to the existing workspace', () => {
    let result: unknown;
    resolve(projectUuid, taskUuid, `/projects/${projectUuid}/tasks/${taskUuid}`).subscribe(value => (result = value));
    http.expectOne(`${serverApiUrl}api/projects/${projectUuid}`).flush({ id: 10, uuid: projectUuid });
    http.expectOne(`${serverApiUrl}api/tasks/${taskUuid}`).flush({ id: 20, uuid: taskUuid, project: { id: 10 } });
    expect(result).toEqual({ projectId: 10, taskId: 20 });
    http.verify();
  });

  it('redirects legacy URLs without losing query parameters or fragments', () => {
    let result: RedirectCommand | undefined;
    resolve('10', null, '/projects/10/documents?category=OTHER#files').subscribe(value => (result = value as RedirectCommand));
    http.expectOne(`${serverApiUrl}api/projects/10`).flush({ id: 10, uuid: projectUuid });
    expect(TestBed.inject(Router).serializeUrl(result!.redirectTo)).toBe(`/projects/${projectUuid}/documents?category=OTHER#files`);
    http.verify();
  });

  it('rejects a task that belongs to another project', () => {
    let result: RedirectCommand | undefined;
    resolve(projectUuid, taskUuid, `/projects/${projectUuid}/tasks/${taskUuid}`).subscribe(value => (result = value as RedirectCommand));
    http.expectOne(`${serverApiUrl}api/projects/${projectUuid}`).flush({ id: 10, uuid: projectUuid });
    http.expectOne(`${serverApiUrl}api/tasks/${taskUuid}`).flush({ id: 20, uuid: taskUuid, project: { id: 99 } });
    expect(TestBed.inject(Router).serializeUrl(result!.redirectTo)).toBe('/404');
    http.verify();
  });
});
