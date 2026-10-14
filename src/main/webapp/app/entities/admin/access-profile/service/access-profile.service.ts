import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { serverApiUrl } from 'app/config';
import { IAccessProfile, IPermissionItem } from '../access-profile.model';

@Injectable({ providedIn: 'root' })
export class AccessProfileService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${serverApiUrl}api/admin/access-profiles`;

  query(): Observable<IAccessProfile[]> {
    return this.http.get<IAccessProfile[]>(this.resourceUrl);
  }

  getPermissions(): Observable<IPermissionItem[]> {
    return this.http.get<IPermissionItem[]>(`${this.resourceUrl}/permissions`);
  }

  create(profile: Omit<IAccessProfile, 'id'>): Observable<IAccessProfile> {
    return this.http.post<IAccessProfile>(this.resourceUrl, profile);
  }

  update(id: number, profile: Partial<IAccessProfile>): Observable<IAccessProfile> {
    return this.http.put<IAccessProfile>(`${this.resourceUrl}/${id}`, profile);
  }

  delete(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${id}`);
  }
}
