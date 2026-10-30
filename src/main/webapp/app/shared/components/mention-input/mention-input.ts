import { Component, input, output, signal, computed } from '@angular/core';
import { IUser } from 'app/entities/user/user.model';

@Component({
  selector: 'jhi-mention-input',
  template: `
    <div class="mention-compose">
      <textarea
        #editor
        class="input-field"
        [value]="value()"
        [disabled]="disabled()"
        maxlength="5000"
        rows="3"
        aria-label="Votre commentaire"
        placeholder="Votre commentaire… Tapez @ pour mentionner un membre."
        aria-autocomplete="list"
        [attr.aria-controls]="opened() ? listId : null"
        [attr.aria-activedescendant]="opened() && matches().length ? listId + '-' + active() : null"
        (input)="onInput(editor)"
        (click)="locate(editor)"
        (keyup)="onKeyUp($event, editor)"
        (keydown)="onKeyDown($event, editor)"
        (blur)="close()"
      ></textarea>
      @if (opened()) {
        <div class="mention-results" role="listbox" [id]="listId" aria-label="Membres du projet">
          @for (member of matches(); track member.id; let index = $index) {
            <button
              type="button"
              role="option"
              [id]="listId + '-' + index"
              [attr.aria-selected]="active() === index"
              [class.active]="active() === index"
              (mousedown)="$event.preventDefault()"
              (click)="select(member, editor)"
            >
              <span class="mention-avatar" aria-hidden="true">{{ member.login?.charAt(0)?.toUpperCase() }}</span>
              <span>{{ member.login }}</span>
            </button>
          } @empty {
            <p role="status">Aucun membre correspondant.</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .mention-compose {
      position: relative;
    }
    textarea {
      width: 100%;
      display: block;
      min-height: 90px;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: white;
      color: #203747;
      font: inherit;
      resize: vertical;
    }
    textarea:focus {
      outline: 2px solid #328cb155;
      border-color: #328cb1;
    }
    textarea:disabled {
      opacity: 0.6;
    }
    .mention-results {
      position: absolute;
      z-index: 20;
      bottom: calc(100% + 6px);
      left: 0;
      right: 0;
      max-height: 220px;
      overflow: auto;
      background: white;
      border: 1px solid #dce8ee;
      border-radius: 12px;
      box-shadow: 0 12px 28px #20374722;
      padding: 6px;
    }
    button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      text-align: left;
      color: #203747;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    button.active,
    button:hover {
      background: #e9f5fa;
    }
    .mention-avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #237d99;
      color: white;
    }
    p {
      margin: 10px;
      font-size: 13px;
      color: #526b7b;
    }
  `,
})
export class MentionInput {
  private static sequence = 0;
  readonly listId = `mention-members-${MentionInput.sequence++}`;
  readonly members = input<IUser[]>([]);
  readonly value = input('');
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  readonly opened = signal(false);
  readonly query = signal('');
  readonly active = signal(0);
  readonly matches = computed(() => this.members().filter(member => member.login?.toLowerCase().includes(this.query().toLowerCase())));
  private start = 0;
  private end = 0;

  onInput(editor: HTMLTextAreaElement): void {
    this.valueChange.emit(editor.value);
    this.locate(editor);
  }

  locate(editor: HTMLTextAreaElement): void {
    const prefix = editor.value.slice(0, editor.selectionStart);
    const match = /(?:^|\s)@([^\s]*)$/.exec(prefix);
    if (!match || editor.selectionStart !== editor.selectionEnd) {
      this.close();
      return;
    }
    this.start = prefix.length - match[1].length - 1;
    this.end = editor.selectionStart;
    this.query.set(match[1]);
    this.active.set(0);
    this.opened.set(true);
  }

  onKeyUp(event: KeyboardEvent, editor: HTMLTextAreaElement): void {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) this.locate(editor);
  }

  onKeyDown(event: KeyboardEvent, editor: HTMLTextAreaElement): void {
    if (!this.opened()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    const members = this.matches();
    if (!members.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.set((this.active() + (event.key === 'ArrowDown' ? 1 : -1) + members.length) % members.length);
      document.getElementById(`${this.listId}-${this.active()}`)?.scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.select(members[this.active()], editor);
    }
  }

  select(member: IUser, editor: HTMLTextAreaElement): void {
    const insertion = `@${member.login} `;
    const text = editor.value.slice(0, this.start) + insertion + editor.value.slice(this.end);
    if (text.length > 5000) return;
    editor.value = text;
    this.valueChange.emit(text);
    this.close();
    editor.focus();
    editor.setSelectionRange(this.start + insertion.length, this.start + insertion.length);
  }

  close(): void {
    this.opened.set(false);
  }
}
