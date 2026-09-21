import dayjs from 'dayjs/esm';

import { IUserManagement, NewUserManagement } from './user-management.model';

export const sampleWithRequiredData: IUserManagement = {
  login: 'Quentin.Petit',
  email: 'Julia5@hotmail.fr',
};

export const sampleWithPartialData: IUserManagement = {
  id: 18824,
  login: 'Rejeanne.Louis4',
  firstName: 'Patrice',
  lastName: 'Cousin',
  email: 'Daphne44@hotmail.fr',
  activated: false,
  langKey: 'en',
  lastModifiedBy: 'par suite de malgré',
  lastModifiedDate: dayjs('2026-09-21T11:37'),
};

export const sampleWithFullData: IUserManagement = {
  id: 26558,
  login: 'Anastasie72',
  firstName: 'Jocelyne',
  lastName: 'Blanc',
  email: 'Serge_Andre65@hotmail.fr',
  activated: false,
  langKey: 'en',
  imageUrl: 'en dedans de',
  createdBy: 'dring',
  createdDate: dayjs('2026-09-21T03:00'),
  lastModifiedBy: 'fonctionnaire',
  lastModifiedDate: dayjs('2026-09-21T03:29'),
};

export const sampleWithNewData: NewUserManagement = {
  email: 'Gontran82@yahoo.fr',
  login: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
