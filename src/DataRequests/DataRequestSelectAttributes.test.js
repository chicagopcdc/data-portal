import {
  getDictionaryAttributes,
  toggleAllAttributes,
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

test('includes nested relationship attributes from the dictionary', () => {
  const attributes = getDictionaryAttributes({
    submitter_id: { type: ['string'] },
    subjects: {
      anyOf: [
        {
          items: {
            properties: {
              id: { type: 'string' },
              submitter_id: { type: 'string' },
            },
          },
        },
      ],
    },
  });

  expect(attributes).toEqual([
    'subjects',
    'subjects.id',
    'subjects.submitter_id',
    'submitter_id',
  ]);
});

test('stops traversing a circular dictionary schema', () => {
  const subject = { properties: {} };
  const procedure = { properties: {} };

  subject.properties.procedures = procedure;
  procedure.properties.subject = subject;

  expect(getDictionaryAttributes({ subject })).toEqual([
    'subject',
    'subject.procedures',
    'subject.procedures.subject',
  ]);
});

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

test('handles a missing template white list', () => {
  expect(validateSelectionsAgainstTables(null, tables)).toEqual({
    validSelections: {},
    skippedTables: [],
    skippedAttributes: [],
  });
});

test('checks all attributes for a table when some are unchecked', () => {
  expect(
    toggleAllAttributes(
      { subject: ['age'], diagnosis: ['disease_type'] },
      'subject',
      ['age', 'submitter_id'],
    ),
  ).toEqual({
    subject: ['age', 'submitter_id'],
    diagnosis: ['disease_type'],
  });
});

test('clears a table when all of its attributes are checked', () => {
  expect(
    toggleAllAttributes(
      {
        subject: ['age', 'submitter_id'],
        diagnosis: ['disease_type'],
      },
      'subject',
      ['age', 'submitter_id'],
    ),
  ).toEqual({ diagnosis: ['disease_type'] });
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
