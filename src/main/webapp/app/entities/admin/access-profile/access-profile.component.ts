import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccessProfileService } from './service/access-profile.service';
import { IAccessProfile, IPermissionItem } from './access-profile.model';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { PaginationComponent } from 'app/shared/components/pagination/pagination.component';

@Component({
  selector: 'jhi-access-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, PaginationComponent],
  template: `<div>
    <div class="mb-5 flex items-center justify-between gap-4 max-[600px]:flex-col max-[600px]:items-start">
      <div>
        <h2 class="text-base font-semibold text-[#172033]">Profils et permissions</h2>
        <p class="mt-0.5 text-xs text-slate-500">Définissez les accès disponibles pour chaque fonction de votre équipe.</p>
      </div>
      <button type="button" class="btn-primary" (click)="openCreate()">+ Nouveau profil</button>
    </div>
    <app-modal
      appearance="editor"
      [isOpen]="showForm"
      [title]="editing ? 'Modifier le profil' : 'Créer un profil'"
      subtitle="Définissez les accès associés à cette fonction."
      [showFooter]="false"
      (close)="closeForm()"
    >
      <form [formGroup]="form" (ngSubmit)="save()" class="rounded-2xl border border-slate-200 bg-white/75 p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-[#172033]">{{ editing ? 'Modifier le profil' : 'Créer un profil' }}</h3>
          <span class="text-[.68rem] text-slate-400">Les permissions déterminent les actions autorisées</span>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <input
            formControlName="name"
            placeholder="Nom du profil (ex. Chef de projet)"
            class="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#328cb1]"
          />
          <input
            formControlName="description"
            placeholder="Description courte"
            class="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#328cb1]"
          />
        </div>
        <label class="mt-3 flex items-center gap-2 text-xs text-slate-600"
          ><input type="checkbox" formControlName="allProjects" /> Accès à tous les projets</label
        >
        <div class="mt-3 grid gap-2 md:grid-cols-2">
          @for (permission of permissions; track permission.key) {
            <label
              class="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs hover:border-[#a8d4e8]"
              ><input type="checkbox" class="mt-0.5" [checked]="selected.has(permission.key)" (change)="toggle(permission.key)" /><span
                ><strong class="font-semibold text-[#172033]">{{ permission.label }}</strong
                ><br /><span class="text-slate-500">{{ permission.description }}</span></span
              ></label
            >
          }
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="submit" class="btn-primary" [disabled]="form.invalid">{{ editing ? 'Enregistrer' : 'Créer le profil' }}</button>
        </div>
        @if (error) {
          <p class="mt-3 text-xs text-red-600">{{ error }}</p>
        }
      </form>
    </app-modal>
    <div class="space-y-3">
      @for (profile of pagedProfiles; track profile.id) {
        <article
          class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-[0_8px_22px_rgba(100,116,139,.06)] max-[600px]:flex-col max-[600px]:items-start"
        >
          <div>
            <strong class="text-sm text-[#172033]">{{ profile.name }}</strong>
            <p class="mt-1 text-xs text-slate-500">{{ profile.description || 'Aucune description' }}</p>
            <span class="mt-2 inline-block text-[.68rem] text-slate-400"
              >{{ profile.permissions.length }} permissions · {{ profile.allProjects ? 'Tous les projets' : 'Projets attribués' }}</span
            >
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-[10px] bg-[#e8edf4] text-slate-600 transition hover:bg-[#dbe3ef] hover:text-[#328cb1]"
              (click)="edit(profile)"
              title="Modifier"
              aria-label="Modifier"
            >
              <svg class="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z"
                />
              </svg>
            </button>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-[10px] bg-red-50 text-red-500 transition hover:bg-red-600 hover:text-white"
              (click)="remove(profile)"
              title="Supprimer"
              aria-label="Supprimer"
            >
              <svg class="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M10 7V4a1 1 0 011-1h2a1 1 0 011 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </article>
      }
    </div>
    <app-pagination class="mt-5 block" [page]="profilePage" [pageCount]="profilePageCount" (pageChange)="profilePage = $event" />
  </div>`,
})
export default class AccessProfileComponent implements OnInit {
  profiles: IAccessProfile[] = [];
  permissions: IPermissionItem[] = [];
  selected = new Set<string>();
  editing: IAccessProfile | null = null;
  error = '';
  showForm = false;
  profilePage = 1;
  readonly profilePageSize = 4;
  get profilePageCount(): number {
    return Math.max(1, Math.ceil(this.profiles.length / this.profilePageSize));
  }
  get pagedProfiles(): IAccessProfile[] {
    if (this.profilePage > this.profilePageCount) this.profilePage = this.profilePageCount;
    const start = (this.profilePage - 1) * this.profilePageSize;
    return this.profiles.slice(start, start + this.profilePageSize);
  }
  private readonly service = inject(AccessProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly form = this.fb.nonNullable.group({ name: ['', Validators.required], description: [''], allProjects: [false] });
  ngOnInit(): void {
    this.load();
    this.service.getPermissions().subscribe(items => (this.permissions = items));
  }
  load(): void {
    this.service.query().subscribe({
      next: items => {
        this.profiles = items;
        this.profilePage = 1;
        this.cdr.markForCheck();
      },
      error: e => (this.error = e.error?.detail ?? 'Chargement des profils impossible.'),
    });
  }
  toggle(key: string): void {
    this.selected.has(key) ? this.selected.delete(key) : this.selected.add(key);
  }
  openCreate(): void {
    this.editing = null;
    this.selected.clear();
    this.form.reset({ name: '', description: '', allProjects: false });
    this.error = '';
    this.showForm = true;
  }
  closeForm(): void {
    this.showForm = false;
    this.error = '';
  }
  edit(profile: IAccessProfile): void {
    this.editing = profile;
    this.form.patchValue({ name: profile.name, description: profile.description ?? '', allProjects: profile.allProjects });
    this.selected = new Set(profile.permissions);
    this.error = '';
    this.showForm = true;
  }
  save(): void {
    if (this.form.invalid) return;
    const payload = { ...this.form.getRawValue(), permissions: [...this.selected] };
    const request = this.editing ? this.service.update(this.editing.id, payload) : this.service.create(payload);
    request.subscribe({
      next: saved => {
        this.editing = null;
        this.showForm = false;
        this.form.reset({ name: '', description: '', allProjects: false });
        this.selected.clear();
        const index = this.profiles.findIndex(profile => profile.id === saved.id);
        this.profiles = index >= 0 ? this.profiles.map(profile => (profile.id === saved.id ? saved : profile)) : [...this.profiles, saved];
        this.cdr.markForCheck();
      },
      error: e => (this.error = e.error?.detail ?? 'Enregistrement impossible.'),
    });
  }
  remove(profile: IAccessProfile): void {
    if (confirm(`Supprimer le profil « ${profile.name} » ?`))
      this.service.delete(profile.id).subscribe({
        next: () => {
          this.profiles = this.profiles.filter(item => item.id !== profile.id);
          this.profilePage = Math.min(this.profilePage, this.profilePageCount);
          this.cdr.markForCheck();
        },
        error: e => (this.error = e.error?.detail ?? 'Ce profil est utilisé.'),
      });
  }
}
