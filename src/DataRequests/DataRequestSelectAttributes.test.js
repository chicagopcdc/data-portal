import {
  validateSavedDatapointsAgainstTables,
  validateSelectionsAgainstTables,
} from './DataRequestSelectAttributes';

const tables = [
  {
    id: 'subject',
    attributes: ['age', 'submitter_id'],
  },
  {
    id: 'diagnosis',
    attributes: ['disease_type'],
  },
];

test('keeps template datapoints that exist in the project dictionary', () => {
  expect(
    validateSelectionsAgainstTables(
      {
        subject: ['submitter_id', 'age'],
        diagnosis: ['disease_type'],
      },
      tables,
    ),
  ).toEqual({
    validSelections: {
      subject: ['age', 'submitter_id'],
      diagnosis: ['disease_type'],
    },
    skippedTables: [],
    skippedAttributes: [],
  });
});

test('skips template tables and attributes missing from the dictionary', () => {
  expect(
    validateSelectionsAgainstTables(
      {
        subject: ['submitter_id', 'removed_attribute'],
        molecular_analysis: ['gene_symbol'],
      },
      tables,
    ),
  ).toEqual({
    validSelections: {
      subject: ['submitter_id'],
    },
    skippedTables: ['molecular_analysis'],
    skippedAttributes: ['subject.removed_attribute'],
  });
});

test('removes duplicate valid attributes', () => {
  expect(
    validateSelectionsAgainstTables({ subject: ['age', 'age'] }, tables)
      .validSelections,
  ).toEqual({ subject: ['age'] });
});

test('validates previously saved datapoints against the current dictionary', () => {
  expect(
    validateSavedDatapointsAgainstTables(
      {
        subject: {
          id: 1,
          value_list: ['age', 'removed_attribute'],
        },
        molecular_analysis: {
          id: 2,
          value_list: ['gene_symbol'],
        },
      },
      tables,
    ),
  ).toEqual({
    validSelections: {
      subject: ['age'],
    },
    skippedTables: ['molecular_analysis'],
    skippedAttributes: ['subject.removed_attribute'],
  });
});
