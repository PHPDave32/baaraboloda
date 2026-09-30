import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config';
import { ISprint } from '../sprint.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../sprint.test-samples';

import { RestSprint, SprintService } from './sprint.service';

const requireRestSample: RestSprint = {
  ...sampleWithRequiredData,
  startDate: sampleWithRequiredData.startDate?.format(DATE_FORMAT),
  endDate: sampleWithRequiredData.endDate?.format(DATE_FORMAT),
  createdAt: sampleWithRequiredData.createdAt?.toJSON(),
  updatedAt: sampleWithRequiredData.updatedAt?.toJSON(),
};

describe('Sprint Service', () => {
  let service: SprintService;
  let httpMock: HttpTestingController;
  let expectedResult: ISprint | ISprint[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(SprintService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find(123).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a Sprint', () => {
      const sprint = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(sprint).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Sprint', () => {
      const sprint = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(sprint).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Sprint', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Sprint', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Sprint', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addSprintToCollectionIfMissing', () => {
      it('should add a Sprint to an empty array', () => {
        const sprint: ISprint = sampleWithRequiredData;
        expectedResult = service.addSprintToCollectionIfMissing([], sprint);
        expect(expectedResult).toEqual([sprint]);
      });

      it('should not add a Sprint to an array that contains it', () => {
        const sprint: ISprint = sampleWithRequiredData;
        const sprintCollection: ISprint[] = [
          {
            ...sprint,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addSprintToCollectionIfMissing(sprintCollection, sprint);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Sprint to an array that doesn't contain it", () => {
        const sprint: ISprint = sampleWithRequiredData;
        const sprintCollection: ISprint[] = [sampleWithPartialData];
        expectedResult = service.addSprintToCollectionIfMissing(sprintCollection, sprint);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(sprint);
      });

      it('should add only unique Sprint to an array', () => {
        const sprintArray: ISprint[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const sprintCollection: ISprint[] = [sampleWithRequiredData];
        expectedResult = service.addSprintToCollectionIfMissing(sprintCollection, ...sprintArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const sprint: ISprint = sampleWithRequiredData;
        const sprint2: ISprint = sampleWithPartialData;
        expectedResult = service.addSprintToCollectionIfMissing([], sprint, sprint2);
        expect(expectedResult).toEqual([sprint, sprint2]);
      });

      it('should accept null and undefined values', () => {
        const sprint: ISprint = sampleWithRequiredData;
        expectedResult = service.addSprintToCollectionIfMissing([], null, sprint, undefined);
        expect(expectedResult).toEqual([sprint]);
      });

      it('should return initial array if no Sprint is added', () => {
        const sprintCollection: ISprint[] = [sampleWithRequiredData];
        expectedResult = service.addSprintToCollectionIfMissing(sprintCollection, undefined, null);
        expect(expectedResult).toEqual(sprintCollection);
      });
    });

    describe('compareSprint', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareSprint(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 19154 };
        const entity2 = null;

        const compareResult1 = service.compareSprint(entity1, entity2);
        const compareResult2 = service.compareSprint(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 19154 };
        const entity2 = { id: 28936 };

        const compareResult1 = service.compareSprint(entity1, entity2);
        const compareResult2 = service.compareSprint(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return true if primaryKey matches', () => {
        const entity1 = { id: 19154 };
        const entity2 = { id: 19154 };

        const compareResult1 = service.compareSprint(entity1, entity2);
        const compareResult2 = service.compareSprint(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
