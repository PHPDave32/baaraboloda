import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AccountService } from 'app/core/auth';
import { WorkspaceService } from '../workspace.service';
import { DocumentsService } from './documents.service';
import Documents from './documents';

describe('Resource recipients', () => {
  let component: Documents;
  const recipients = vi.fn();
  const update = vi.fn();
  beforeEach(() => {
    update.mockReset().mockReturnValue(of(null));
    recipients.mockReset().mockReturnValue(
      of([
        { login: 'alice', firstName: 'Élodie', lastName: 'Traoré' },
        { login: 'bob', firstName: 'Moussa', lastName: 'Diallo' },
      ]),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountService, useValue: { account: () => ({ login: 'author' }), hasAnyAuthority: () => true } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: WorkspaceService, useValue: {} },
        { provide: DocumentsService, useValue: { recipients, update, list: () => of([]) } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new Documents());
    component.projectId = 1;
    component.loadRecipients();
  });
  it('edits its own resource while preserving the file and visibility', () => {
    const resource = {
      id: 4,
      title: 'Original',
      description: '',
      category: 'OTHER',
      url: null,
      filename: 'secret.pdf',
      fileSize: 10,
      author: 'author',
      createdAt: '',
      taskId: null,
      restricted: true,
    };
    component.editResource(resource);
    expect(component.form.controls.title.value).toBe('Original');
    component.form.controls.title.setValue('Updated');
    component.save();
    expect(update).toHaveBeenCalled();
    const body = update.mock.calls[0][2] as FormData;
    expect(body.get('title')).toBe('Updated');
    expect(body.has('file')).toBe(false);
    expect(body.has('restricted')).toBe(false);
  });

  it('shows the system directory without requiring project membership', () => {
    expect(component.visibilityCandidates()).toHaveLength(2);
    expect(recipients).toHaveBeenCalledWith(1);
  });
  it('searches names without accents and identifiers without losing selections', () => {
    component.toggleReader('bob');
    component.recipientSearch.set('ELODIE');
    expect(component.visibilityCandidates().map(user => user.login)).toEqual(['alice']);
    component.recipientSearch.set('BOB');
    expect(component.visibilityCandidates().map(user => user.login)).toEqual(['bob']);
    expect(component.allowedLogins()).toEqual(['bob']);
  });
  it('filters selected users and removes a recipient', () => {
    component.toggleReader('alice');
    component.selectedOnly.set(true);
    expect(component.visibilityCandidates().map(user => user.login)).toEqual(['alice']);
    component.toggleReader('alice');
    expect(component.visibilityCandidates()).toEqual([]);
  });
  it('shows a recoverable error when loading the directory fails', () => {
    recipients.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.loadRecipients();
    expect(component.recipientsError()).toBeTruthy();
    expect(component.recipientsLoading()).toBe(false);
    component.loadRecipients();
    expect(component.recipientsError()).toBe('');
  });
});
