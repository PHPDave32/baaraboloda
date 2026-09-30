import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { PlanningService } from '../planning.service';
import { BadgeComponent } from 'app/shared/components/badge/badge.component';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { ToastService } from 'app/shared/toast/toast.service';

@Component({
  selector: 'jhi-project-sprints',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, BadgeComponent, AvatarComponent, ModalComponent],
  templateUrl: './sprints.html',
})
export default class Sprints implements OnInit {
  projectId = 0;
  project: IProject | null = null;
  sprints: ISprint[] = [];
  form!: FormGroup;
  showForm = false;
  loading = false;
  error = '';
  editingSprint: ISprint | null = null;
  sprintToDelete: ISprint | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly planningService = inject(PlanningService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      goal: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });

    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id') || params.get('projectId') || 0);
      if (this.projectId) {
        this.loadProject();
        this.loadSprints();
      }
    });
  }

  loadProject(): void {
    this.planningService.getProject(this.projectId).subscribe({
      next: project => {
        this.project = project;
        this.cdr.markForCheck();
      },
    });
  }

  loadSprints(): void {
    this.loading = true;
    this.planningService.getSprints(this.projectId).subscribe({
      next: sprints => {
        this.sprints = sprints;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;

    const { name, goal, startDate, endDate } = this.form.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < today) {
      this.error = 'La date de début ne peut pas être dans le passé.';
      return;
    }
    if (end < today) {
      this.error = 'La date de fin ne peut pas être dans le passé.';
      return;
    }
    if (end <= start) {
      this.error = 'La date de fin doit être après la date de début.';
      return;
    }

    const overlap = this.sprints.find(s => {
      if (s.id === this.editingSprint?.id) return false;
      if (!s.startDate || !s.endDate) return false;
      const sStart = this.toDate(s.startDate);
      const sEnd = this.toDate(s.endDate);
      return start <= sEnd && end >= sStart;
    });
    if (overlap) {
      this.error = `Ces dates chevauchent le sprint "${overlap.name}" (${this.formatDate(overlap.startDate)} → ${this.formatDate(overlap.endDate)}).`;
      return;
    }

    const sprint = this.editingSprint;
    if (sprint) {
      if (sprint.status !== 'PLANNED') {
        this.error = 'Seul un sprint non démarré peut être modifié.';
        return;
      }
      this.loading = true;
      this.error = '';
      this.planningService.updateSprint(sprint, { name, goal, startDate: startDate as any, endDate: endDate as any }).subscribe({
        next: () => {
          this.form.reset();
          this.showForm = false;
          this.editingSprint = null;
          this.loading = false;
          this.toast.success(`Le sprint « ${name} » a été modifié.`);
          this.loadSprints();
        },
        error: () => {
          this.loading = false;
          this.toast.error('La modification du sprint a échoué.');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.planningService.createSprint(this.projectId, { name, goal, startDate: startDate as any, endDate: endDate as any }).subscribe({
      next: () => {
        this.form.reset();
        this.showForm = false;
        this.loading = false;
        this.toast.success(`Le sprint « ${name} » a été créé.`);
        this.loadSprints();
      },
      error: () => {
        this.loading = false;
        this.toast.error('La création du sprint a échoué.');
        this.cdr.markForCheck();
      },
    });
  }

  openCreateForm(): void {
    this.editingSprint = null;
    this.error = '';
    this.form.reset();
    this.showForm = true;
  }

  canEditSprint(sprint: ISprint): boolean {
    return sprint.status === 'PLANNED';
  }

  openEditForm(sprint: ISprint): void {
    if (!this.canEditSprint(sprint)) return;
    this.editingSprint = sprint;
    this.error = '';
    this.form.reset({
      name: sprint.name ?? '',
      goal: sprint.goal ?? '',
      startDate: this.toDateInput(sprint.startDate),
      endDate: this.toDateInput(sprint.endDate),
    });
    this.showForm = true;
  }

  private toDateInput(value: any): string {
    if (!value) return '';
    if (typeof value.format === 'function') return value.format('YYYY-MM-DD');
    const d = this.toDate(value);
    if (isNaN(d.getTime())) return '';
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingSprint = null;
    this.form.reset();
    this.error = '';
  }

  deleteSprint(id: number): void {
    this.sprintToDelete = this.sprints.find(s => s.id === id) ?? ({ id } as ISprint);
    this.cdr.markForCheck();
  }

  closeDeleteSprintModal(): void {
    this.sprintToDelete = null;
    this.cdr.markForCheck();
  }

  confirmDeleteSprint(): void {
    const sprint = this.sprintToDelete;
    if (!sprint) return;
    this.planningService.deleteSprint(sprint.id).subscribe({
      next: () => {
        this.sprintToDelete = null;
        this.toast.success('Sprint supprimé.');
        this.loadSprints();
      },
      error: () => {
        this.sprintToDelete = null;
        this.toast.error('La suppression du sprint a échoué.');
        this.cdr.markForCheck();
      },
    });
  }

  activateSprint(sprint: ISprint): void {
    const alreadyActive = this.sprints.find(s => s.id !== sprint.id && s.status === 'ACTIVE');
    if (alreadyActive) {
      this.toast.warning(`Le sprint « ${alreadyActive.name} » est déjà en cours. Terminez-le avant d'en activer un autre.`);
      return;
    }
    this.planningService.updateSprint(sprint, { status: 'ACTIVE' }).subscribe({
      next: () => {
        this.toast.success(`Le sprint « ${sprint.name} » est maintenant en cours.`);
        this.loadSprints();
      },
      error: () => {
        this.toast.error('Impossible d’activer ce sprint : un sprint est déjà en cours pour ce projet.');
      },
    });
  }

  completeSprint(sprint: ISprint): void {
    this.planningService.updateSprint(sprint, { status: 'COMPLETED' }).subscribe({
      next: () => {
        this.toast.success(`Le sprint « ${sprint.name} » a été terminé.`);
        this.loadSprints();
      },
      error: () => this.toast.error('Impossible de terminer le sprint.'),
    });
  }

  getDaysDifference(startDate: any, endDate: any): number {
    if (!startDate || !endDate) return 0;
    const start = this.toDate(startDate).getTime();
    const end = this.toDate(endDate).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  }

  formatDate(dateVal: any): string {
    if (!dateVal) return '-';
    const d = this.toDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  getAuthorName(user: any): string {
    if (!user) return 'Utilisateur';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.login || user.firstName || 'Utilisateur';
  }

  private toDate(dateVal: any): Date {
    if (!dateVal) return new Date(0);
    if (typeof dateVal.toDate === 'function') return dateVal.toDate(); // Dayjs
    if (typeof dateVal.toISOString === 'function') return dateVal; // Date native
    if (typeof dateVal === 'string') {
      const [year, month, day] = dateVal.split('-').map(Number);
      if (year && month && day) return new Date(year, month - 1, day);
      return new Date(dateVal);
    }
    return new Date(dateVal);
  }
}
