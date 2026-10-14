import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { DocumentsService } from '../documents.service';
import { DocumentActions } from './document-actions';

describe('Document preview access', () => {
  const download = vi.fn();
  let component: DocumentActions;
  let setFilename: (filename: string) => void;
  beforeEach(() => {
    download.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: DocumentsService, useValue: { download } }] });
    const fixture = TestBed.createComponent(DocumentActions);
    fixture.componentRef.setInput('projectId', 1);
    setFilename = filename => fixture.componentRef.setInput('document', { id: 2, title: 'Document', filename });
    setFilename('document.pdf');
    component = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test-document'), revokeObjectURL: vi.fn() }));
  });
  it('uses the authenticated download endpoint for PDF previews and releases the blob on close', () => {
    download.mockReturnValue(of(new Blob(['%PDF-test'])));
    component.preview();
    expect(download).toHaveBeenCalledWith(1, 2);
    expect(component.kind()).toBe('pdf');
    expect(component.objectUrl()).toBe('blob:test-document');
    component.clearPreview();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-document');
    expect(component.safeUrl()).toBeNull();
  });
  it('does not expose an object URL when access is denied', () => {
    download.mockReturnValue(throwError(() => ({ status: 404 })));
    component.preview();
    expect(component.previewError()).toBeTruthy();
    expect(component.objectUrl()).toBe('');
    expect(component.loading()).toBe(false);
  });
  it('keeps unsupported formats available for download without embedding them', () => {
    setFilename('document.docx');
    component.preview();
    expect(download).not.toHaveBeenCalled();
    expect(component.safeUrl()).toBeNull();
  });
  it('checks access again for downloading and reports a denial', () => {
    download.mockReturnValue(throwError(() => ({ status: 403 })));
    component.download();
    expect(download).toHaveBeenCalledWith(1, 2);
    expect(component.downloadError()).toBeTruthy();
    expect(component.downloading()).toBe(false);
  });
});
