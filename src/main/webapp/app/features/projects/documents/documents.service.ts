import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { serverApiUrl } from 'app/config';

export interface ProjectDocument {
  id: number;
  title: string;
  description: string | null;
  category: string;
  url: string | null;
  filename: string | null;
  fileSize: number | null;
  author: string;
  createdAt: string;
  taskId: number | null;
  restricted: boolean;
}

export interface ResourceRecipient {
  login: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ResourceVisibility {
  restricted: boolean;
  allowedLogins: string[];
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);

  list(projectId: number): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(this.endpoint(projectId));
  }

  create(projectId: number, body: FormData): Observable<unknown> {
    return this.http.post<unknown>(this.endpoint(projectId), body);
  }

  update(projectId: number, id: number, body: FormData): Observable<unknown> {
    return this.http.put(`${this.endpoint(projectId)}/${id}`, body);
  }

  recipients(projectId: number): Observable<ResourceRecipient[]> {
    return this.http.get<ResourceRecipient[]>(`${this.endpoint(projectId)}/recipients`);
  }

  visibility(projectId: number, id: number): Observable<ResourceVisibility> {
    return this.http.get<ResourceVisibility>(`${this.endpoint(projectId)}/${id}/visibility`);
  }

  updateVisibility(projectId: number, id: number, body: ResourceVisibility): Observable<unknown> {
    return this.http.put(`${this.endpoint(projectId)}/${id}/visibility`, body);
  }

  download(projectId: number, id: number): Observable<Blob> {
    return this.http.get(`${this.endpoint(projectId)}/${id}/download`, { responseType: 'blob' });
  }

  delete(projectId: number, id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.endpoint(projectId)}/${id}`);
  }

  private endpoint(projectId: number): string {
    return `${serverApiUrl}api/projects/${projectId}/documents`;
  }
}
