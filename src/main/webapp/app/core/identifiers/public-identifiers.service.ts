import { Injectable } from '@angular/core';

export type PublicEntity = 'project' | 'task' | 'sprint';

/** Maps loaded DTOs to their public UUID without changing internal entity relationships. */
@Injectable({ providedIn: 'root' })
export class PublicIdentifiers {
  private readonly identifiers = new Map<string, string>();

  publicId(type: PublicEntity, id: number | string | null | undefined): string | null {
    if (id == null) return null;
    return this.identifiers.get(`${type}:${id}`) ?? String(id);
  }

  remember(type: PublicEntity | undefined, value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(item => this.remember(type, item));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const entity = value as Record<string, unknown>;
    if (type && typeof entity['id'] === 'number' && typeof entity['uuid'] === 'string') {
      this.identifiers.set(`${type}:${entity['id']}`, entity['uuid']);
    }
    for (const relation of ['project', 'task', 'sprint'] as const) {
      if (entity[relation]) this.remember(relation, entity[relation]);
    }
  }

  apiUrl(url: string): string {
    return url.replace(
      /((?:^|\/)api\/(?:tasks\/)?)(projects|tasks|sprints)\/(\d+)(?=\/|\?|$)/g,
      (_match, prefix: string, collection: string, id: string) => {
        const type = collection.slice(0, -1) as PublicEntity;
        return `${prefix}${collection}/${this.publicId(type, id)}`;
      },
    );
  }
}
