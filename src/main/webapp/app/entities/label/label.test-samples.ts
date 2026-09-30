import { ILabel, NewLabel } from './label.model';

export const sampleWithRequiredData: ILabel = {
  id: 28258,
  name: 'hypocrite',
};

export const sampleWithPartialData: ILabel = {
  id: 29694,
  name: 'touriste quelquefois snif',
  color: 'jaune mimosa',
};

export const sampleWithFullData: ILabel = {
  id: 11722,
  name: 'fidèle trop ronfler',
  color: 'aubergine',
};

export const sampleWithNewData: NewLabel = {
  name: 'rapide du côté de croâ',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
