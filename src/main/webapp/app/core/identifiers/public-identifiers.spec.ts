import { describe, expect, it } from 'vitest';
import { PublicIdentifiers } from './public-identifiers.service';

const projectUuid = '550e8400-e29b-41d4-a716-446655440000';
const taskUuid = '7f90d722-dfa9-40fe-b654-37260f437309';

describe('Public identifiers', () => {
  it('uses separate namespaces for identical numeric IDs and remembers nested relationships', () => {
    const ids = new PublicIdentifiers();
    ids.remember('task', [{ id: 42, uuid: taskUuid, project: { id: 42, uuid: projectUuid } }]);
    expect(ids.publicId('task', 42)).toBe(taskUuid);
    expect(ids.publicId('project', 42)).toBe(projectUuid);
    expect(ids.publicId('project', projectUuid)).toBe(projectUuid);
  });

  it('translates public API paths, including nested project endpoints, without changing user or document IDs', () => {
    const ids = new PublicIdentifiers();
    ids.remember('project', { id: 42, uuid: projectUuid });
    ids.remember('task', { id: 42, uuid: taskUuid });
    expect(ids.apiUrl('api/projects/42/documents/15')).toBe(`api/projects/${projectUuid}/documents/15`);
    expect(ids.apiUrl('/api/tasks/projects/42/backlog')).toBe(`/api/tasks/projects/${projectUuid}/backlog`);
    expect(ids.apiUrl('https://example.test/api/tasks/42/assignee')).toBe(`https://example.test/api/tasks/${taskUuid}/assignee`);
    expect(ids.apiUrl('/api/projects/42/members/42')).toBe(`/api/projects/${projectUuid}/members/42`);
    expect(ids.apiUrl('/api/admin/users/42')).toBe('/api/admin/users/42');
    expect(ids.apiUrl('api/tasks/42?x=1')).toBe(`api/tasks/${taskUuid}?x=1`);
  });
});
