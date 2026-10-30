import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageAttachmentsComponent } from './image-attachments';

describe('Comment PDF attachments', () => {
  let component: ImageAttachmentsComponent;
  beforeEach(() => {
    // FileReader (jsdom) s'appuie sur les vrais timers : ne pas hériter de fake timers d'un autre spec.
    vi.useRealTimers();
    TestBed.configureTestingModule({ providers: [{ provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } }] });
    component = TestBed.runInInjectionContext(() => new ImageAttachmentsComponent());
    component.editable = true;
  });
  it('accepts a PDF when enabled for comments', async () => {
    component.allowPdf = true;
    const emit = vi.spyOn(component.imagesChange, 'emit');
    await component.add([new File(['%PDF-1.4\n%%EOF'], 'document.pdf', { type: 'application/pdf' })]);
    expect(emit).toHaveBeenCalledWith([expect.objectContaining({ name: 'document.pdf', type: 'application/pdf' })]);
    expect(component.reading).toBe(false);
  });
  it('rejects PDFs in image-only fields', async () => {
    const emit = vi.spyOn(component.imagesChange, 'emit');
    await component.add([new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' })]);
    expect(emit).not.toHaveBeenCalled();
    expect(component.error).toBeTruthy();
  });
  it('recognizes PDF extensions when the browser provides no MIME type', async () => {
    component.allowPdf = true;
    const emit = vi.spyOn(component.imagesChange, 'emit');
    await component.add([new File(['%PDF-1.4'], 'document.PDF')]);
    expect(emit).toHaveBeenCalledWith([expect.objectContaining({ type: 'application/pdf' })]);
  });
});
