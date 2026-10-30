import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { serverApiUrl } from 'app/config';
import { publicIdentifiersInterceptor } from './public-identifiers.interceptor';
import { PublicIdentifiers } from './public-identifiers.service';

const projectUuid = '550e8400-e29b-41d4-a716-446655440000';
const taskUuid = '7f90d722-dfa9-40fe-b654-37260f437309';

describe('UUID API transport', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([publicIdentifiersInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('learns UUIDs from task lists, rewrites subsequent paths, and keeps internal request bodies intact', () => {
    http.get(`${serverApiUrl}api/tasks/projects/10/tasks`).subscribe();
    controller
      .expectOne(`${serverApiUrl}api/tasks/projects/10/tasks`)
      .flush([{ id: 20, uuid: taskUuid, project: { id: 10, uuid: projectUuid } }]);
    http.patch(`${serverApiUrl}api/tasks/20`, { id: 20, title: 'Updated' }).subscribe();
    const update = controller.expectOne(`${serverApiUrl}api/tasks/${taskUuid}`);
    expect(update.request.body).toEqual({ id: 20, title: 'Updated' });
    update.flush({ id: 20, uuid: taskUuid });
    http.get(`${serverApiUrl}api/projects/10/documents`).subscribe();
    controller.expectOne(`${serverApiUrl}api/projects/${projectUuid}/documents`).flush([]);
    expect(TestBed.inject(PublicIdentifiers).publicId('project', 10)).toBe(projectUuid);
    controller.verify();
  });

  it('does not mistake documents for project DTOs', () => {
    http.get(`${serverApiUrl}api/projects/10/documents`).subscribe();
    controller.expectOne(`${serverApiUrl}api/projects/10/documents`).flush([{ id: 10, uuid: taskUuid }]);
    expect(TestBed.inject(PublicIdentifiers).publicId('project', 10)).toBe('10');
    controller.verify();
  });
  it('does not rewrite identifiers sent to an unrelated origin', () => {
    TestBed.inject(PublicIdentifiers).remember('project', { id: 10, uuid: projectUuid });
    http.get('https://unrelated.example/api/projects/10').subscribe();
    controller.expectOne('https://unrelated.example/api/projects/10').flush({});
    controller.verify();
  });

  it('learns public IDs from projected relationships such as label DTOs', () => {
    http.get(`${serverApiUrl}api/labels`).subscribe();
    controller.expectOne(`${serverApiUrl}api/labels`).flush([{ id: 10, project: { id: 10, uuid: projectUuid } }]);
    expect(TestBed.inject(PublicIdentifiers).publicId('project', 10)).toBe(projectUuid);
    controller.verify();
  });
});
