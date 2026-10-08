import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IUser } from 'app/entities/user/user.model';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'jhi-project-members',
  imports: [AvatarComponent],
  template: `
    <div class="members" role="group" aria-label="Membres du projet">
      @if (filterable) {
        <button
          type="button"
          class="member all"
          [class.selected]="selected === 'ALL'"
          [attr.aria-pressed]="selected === 'ALL'"
          (click)="selectedChange.emit('ALL')"
          title="Tous les membres"
          aria-label="Afficher toutes les tâches"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
          </svg>
        </button>
      }
      @for (member of members; track member.id; let index = $index) {
        @if (filterable) {
          <button
            type="button"
            class="member"
            [class.selected]="selected === member.id"
            [attr.aria-pressed]="selected === member.id"
            [attr.aria-label]="'Filtrer les tâches de ' + member.login"
            [title]="member.login ?? 'Membre'"
            (click)="selectedChange.emit(selected === member.id ? 'ALL' : member.id)"
          >
            <app-avatar [user]="member" size="md" [color]="colors[index % colors.length]" />
          </button>
        } @else {
          <span class="member" tabindex="0" [attr.aria-label]="member.login" [title]="member.login ?? 'Membre'"
            ><app-avatar [user]="member" size="md" [color]="colors[index % colors.length]"
          /></span>
        }
      } @empty {
        <span class="empty">Aucun membre</span>
      }
    </div>
  `,
  styleUrl: './project-members.scss',
})
export class ProjectMembersComponent {
  @Input() members: Pick<IUser, 'id' | 'login' | 'imageUrl'>[] = [];
  @Input() selected: number | 'ALL' | 'UNASSIGNED' = 'ALL';
  @Input() filterable = true;
  @Output() selectedChange = new EventEmitter<number | 'ALL' | undefined>();
  readonly colors = ['#328cb1', '#4058bb', '#9466c2', '#b76c29', '#bc4858', '#258971'];
}
