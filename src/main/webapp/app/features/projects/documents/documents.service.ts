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
