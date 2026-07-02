import {
  buildDensityHeatmapModel,
  collectDensityHeatmapFields,
  formatDensityPercentage,
  getDensityHeatmapColor,
  getDensityHeatmapFieldLabel,
  hasHeatmapFieldValue,
} from './utils';

describe('Explorer density heatmap helpers', () => {
  it('keeps configured heatmap fields in order and removes duplicates', () => {
    const result = collectDensityHeatmapFields({
      tableFields: ['project', 'study'],
      filterTabs: [
        { fields: ['study', 'race'] },
        { fields: ['gender'] },
      ],
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
    expect(hasHeatmapFieldValue({ diagnoses: [] }, 'diagnoses.stage')).toBe(false);
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
    expect(formatDensityPercentage(0.625)).toBe('63%');
    expect(getDensityHeatmapFieldLabel('file_type', {})).toBe('File Type');
    expect(getDensityHeatmapColor(0)).toContain('var(--g3-color__silver)');
  });
});