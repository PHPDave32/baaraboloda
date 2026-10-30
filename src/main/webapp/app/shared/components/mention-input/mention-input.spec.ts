import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { MentionInput } from './mention-input';

describe('Project member mentions', () => {
  function setup() {
    const fixture = TestBed.createComponent(MentionInput);
    fixture.componentRef.setInput('members', [
      { id: 1, login: 'alice' },
      { id: 2, login: 'bob@example.test' },
    ]);
    fixture.detectChanges();
    const editor: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const type = (text: string, caret = text.length): void => {
      editor.value = text;
      editor.setSelectionRange(caret, caret);
      editor.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, editor, type };
  }

  it('filters members and inserts a selected email login while preserving following text', () => {
    const { fixture, editor, type } = setup();
    let value = '';
    fixture.componentInstance.valueChange.subscribe(text => (value = text));
    type('Merci @bo pour ton aide', 9);
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(1);
    fixture.nativeElement.querySelector('[role="option"]').click();
    expect(value).toBe('Merci @bob@example.test  pour ton aide');
    expect(editor.selectionStart).toBe('Merci @bob@example.test '.length);
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('supports arrow keys, Enter and Escape without submitting the comment', () => {
    const { fixture, editor, type } = setup();
    type('@');
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(2);
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    editor.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(editor.value).toBe('@bob@example.test ');
    type('@');
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('does not open for ordinary email text and reports no matching member', () => {
    const { fixture, type } = setup();
    type('alice@example.test');
    expect(fixture.componentInstance.opened()).toBe(false);
    type('@absent');
    expect(fixture.nativeElement.textContent).toContain('Aucun membre correspondant.');
  });
});
