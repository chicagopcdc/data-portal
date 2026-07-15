import {
  buildDensityHeatmapModel,
  collectDensityHeatmapFields,
  extractFieldsFromFilter,
  formatDensityPercentage,
  getDensityHeatmapColor,
  getDensityHeatmapFieldLabel,
  hasHeatmapFieldValue,
} from './utils';

describe('Explorer density heatmap helpers', () => {
  it('keeps configured heatmap fields in order and removes duplicates', () => {
    const result = collectDensityHeatmapFields({
      tableFields: ['project', 'study'],
      filterTabs: [{ fields: ['study', 'race'] }, { fields: ['gender'] }],
    });

    expect(result).toEqual(['project', 'study', 'race', 'gender']);
  });

  it('falls back to all fields when no configured fields exist', () => {
    const result = collectDensityHeatmapFields({
      allFields: ['file_type', 'created_datetime'],
    });

    expect(result).toEqual(['file_type', 'created_datetime']);
  });

  it('resolves nested field values from object and array paths', () => {
    const row = {
      case_id: 'case-1',
      diagnoses: [{ stage: 'I' }, { stage: 'II' }],
    };

    expect(hasHeatmapFieldValue(row, 'case_id')).toBe(true);
    expect(hasHeatmapFieldValue(row, 'diagnoses.stage')).toBe(true);
    expect(hasHeatmapFieldValue({ diagnoses: [] }, 'diagnoses.stage')).toBe(
      false,
    );
  });

  it('builds density buckets from the raw rows', () => {
    const rawData = [
      { project: 'A', diagnoses: [{ stage: 'I' }], race: 'White' },
      { project: null, diagnoses: [], race: null },
      { project: 'B', diagnoses: [{ stage: 'II' }], race: 'Asian' },
      { project: 'C', diagnoses: null, race: 'Black' },
    ];

    const model = buildDensityHeatmapModel({
      fieldInfo: { project: { label: 'Project' } },
      fields: ['project', 'diagnoses.stage', 'race'],
      rawData,
      bucketCount: 2,
    });

    expect(model.buckets).toHaveLength(2);
    expect(model.rows).toHaveLength(3);
    expect(model.rows[0].label).toBe('Project');
    expect(model.rows[0].cells.map((cell) => cell.density)).toEqual([0.5, 1]);
    expect(model.rows[1].cells.map((cell) => cell.density)).toEqual([0.5, 0.5]);
    expect(model.rows[2].cells.map((cell) => cell.density)).toEqual([0.5, 1]);
  });

  it('formats density and field labels consistently', () => {
    expect(formatDensityPercentage(0.625)).toBe('62.5%');
    expect(formatDensityPercentage(0.85)).toBe('85%');
    expect(formatDensityPercentage(0.855)).toBe('85.5%');
    expect(formatDensityPercentage(0.8567)).toBe('85.67%');
    expect(formatDensityPercentage(0.85678)).toBe('85.68%');
    expect(getDensityHeatmapFieldLabel('file_type', {})).toBe('File Type');
    expect(getDensityHeatmapColor(0)).toContain('var(--g3-color__silver)');
  });

  it('interpolates colors correctly for low, medium, and high densities', () => {
    expect(getDensityHeatmapColor(0)).toBe('var(--g3-color__silver)');
    expect(getDensityHeatmapColor(-0.5)).toBe('var(--g3-color__silver)');
    expect(getDensityHeatmapColor(0.001)).toBe('#e74c3c');
    expect(getDensityHeatmapColor(0.25)).toBe('#ee833e');
    expect(getDensityHeatmapColor(0.5)).toBe('#f4b940');
    expect(getDensityHeatmapColor(1.0)).toBe('#7ec500');
  });
});

describe('extractFieldsFromFilter', () => {
  it('returns empty array for null/undefined/empty filter', () => {
    expect(extractFieldsFromFilter(null)).toEqual([]);
    expect(extractFieldsFromFilter(undefined)).toEqual([]);
    expect(extractFieldsFromFilter({})).toEqual([]);
    expect(extractFieldsFromFilter({ __type: 'STANDARD' })).toEqual([]);
  });

  it('extracts fields with OPTION selectedValues', () => {
    const filter = {
      __type: 'STANDARD',
      value: {
        disease_type: {
          __type: 'OPTION',
          selectedValues: ['Lung Cancer', 'Breast Cancer'],
        },
        project_id: {
          __type: 'OPTION',
          selectedValues: [],
        },
      },
    };

    expect(extractFieldsFromFilter(filter)).toEqual(['disease_type']);
  });

  it('extracts fields with RANGE bounds', () => {
    const filter = {
      __type: 'STANDARD',
      value: {
        age_at_diagnosis: {
          lowerBound: 20,
          upperBound: 80,
        },
      },
    };

    expect(extractFieldsFromFilter(filter)).toEqual(['age_at_diagnosis']);
  });

  it('extracts nested fields from ANCHORED filters', () => {
    const filter = {
      __type: 'STANDARD',
      value: {
        'anchor:cases': {
          __type: 'ANCHORED',
          value: {
            race: {
              __type: 'OPTION',
              selectedValues: ['White'],
            },
            ethnicity: {
              __type: 'OPTION',
              selectedValues: [],
            },
          },
        },
      },
    };

    expect(extractFieldsFromFilter(filter)).toEqual(['race']);
  });

  it('handles mixed filter types', () => {
    const filter = {
      __type: 'STANDARD',
      value: {
        gender: {
          __type: 'OPTION',
          selectedValues: ['Female'],
        },
        age: {
          lowerBound: 30,
          upperBound: 60,
        },
        'anchor:nested': {
          __type: 'ANCHORED',
          value: {
            stage: {
              __type: 'OPTION',
              selectedValues: ['III'],
            },
          },
        },
      },
    };

    expect(extractFieldsFromFilter(filter)).toEqual(['gender', 'age', 'stage']);
  });

  it('returns empty array for COMPOSED filters', () => {
    const filter = {
      __type: 'COMPOSED',
      value: [],
    };

    expect(extractFieldsFromFilter(filter)).toEqual([]);
  });

  it('deduplicates field names', () => {
    const filter = {
      __type: 'STANDARD',
      value: {
        race: {
          __type: 'OPTION',
          selectedValues: ['White'],
        },
        'anchor:cases': {
          __type: 'ANCHORED',
          value: {
            race: {
              __type: 'OPTION',
              selectedValues: ['Black'],
            },
          },
        },
      },
    };

    expect(extractFieldsFromFilter(filter)).toEqual(['race']);
  });
});
