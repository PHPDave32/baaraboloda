import { Pipe, PipeTransform, inject } from '@angular/core';
import { PublicEntity, PublicIdentifiers } from './public-identifiers.service';

@Pipe({ name: 'publicId' })
export class PublicIdPipe implements PipeTransform {
  private readonly identifiers = inject(PublicIdentifiers);

  transform(id: number | string | null | undefined, type: PublicEntity): string | null {
    return this.identifiers.publicId(type, id);
  }
}
