import { interpolateYlGnBu } from 'd3-scale-chromatic';
import { capitalizeFirstLetter } from '../../utils';

/** @param {{ tableFields?: string[]; filterTabs?: { fields?: string[] }[]; allFields?: string[] }} args */
export function collectDensityHeatmapFields({
  tableFields = [],
  filterTabs = [],
  allFields = [],
}) {
  const configuredFields = [
    ...tableFields,
    ...filterTabs.flatMap((tab) => tab.fields ?? []),
  ].filter(Boolean);

  const orderedFields = [];
  const sourceFields = configuredFields.length > 0 ? configuredFields : allFields;

  for (const field of sourceFields) {
    if (!orderedFields.includes(field)) orderedFields.push(field);
  }

  return orderedFields;
}

/** @param {string} field @param {{ [field: string]: { label?: string } }} fieldInfo */
export function getDensityHeatmapFieldLabel(field, fieldInfo = {}) {
  return fieldInfo[field]?.label ?? capitalizeFirstLetter(field);
}

/** @param {any} value */
function isPresentValue(value) {
  if (Array.isArray(value)) return value.some(isPresentValue);
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return String(value).trim() !== '';
}

/** @param {any} value @param {string[]} segments */
function resolveFieldValues(value, segments) {
  if (value === null || value === undefined) return [];
  if (segments.length === 0) return [value];

  if (Array.isArray(value))
    return value.flatMap((item) => resolveFieldValues(item, segments));

  if (typeof value !== 'object') return [];

  const [head, ...rest] = segments;
  return resolveFieldValues(value[head], rest);
}

/** @param {Object[]} rawData @param {string} field */
export function hasHeatmapFieldValue(rawDataRow, field) {
  return resolveFieldValues(rawDataRow, field.split('.')).some(isPresentValue);
}

/** @param {{ rawData?: Object[]; fields?: string[]; bucketCount?: number; fieldInfo?: { [field: string]: { label?: string } } }} args */
export function buildDensityHeatmapModel({
  rawData = [],
  fields = [],
  bucketCount = 18,
  fieldInfo = {},
}) {
  if (rawData.length === 0 || fields.length === 0) {
    return {
      averageDensity: 0,
      buckets: [],
      rows: [],
      totalRecords: rawData.length,
    };
  }

  const visibleBucketCount = Math.min(bucketCount, rawData.length);
  const bucketSize = Math.ceil(rawData.length / visibleBucketCount);

  const buckets = Array.from({ length: visibleBucketCount }, (_, index) => {
    const startIndex = index * bucketSize;
    const endIndex = Math.min(rawData.length, startIndex + bucketSize);
    return {
      index,
      label:
        startIndex === endIndex - 1
          ? `${startIndex + 1}`
          : `${startIndex + 1}-${endIndex}`,
      size: endIndex - startIndex,
      startIndex,
      endIndex,
    };
  });

  const rows = fields.map((field) => {
    const cells = buckets.map((bucket) => {
      const slice = rawData.slice(bucket.startIndex, bucket.endIndex);
      const presentCount = slice.reduce(
        (count, row) => count + (hasHeatmapFieldValue(row, field) ? 1 : 0),
        0,
      );
      const totalCount = slice.length;
      const density = totalCount === 0 ? 0 : presentCount / totalCount;

      return {
        bucketIndex: bucket.index,
        density,
        field,
        presentCount,
        totalCount,
      };
    });

    const averageDensity =
      cells.length === 0
        ? 0
        : cells.reduce((sum, cell) => sum + cell.density, 0) / cells.length;

    return {
      averageDensity,
      cells,
      field,
      label: getDensityHeatmapFieldLabel(field, fieldInfo),
    };
  });

  const averageDensity =
    rows.length === 0
      ? 0
      : rows.reduce((sum, row) => sum + row.averageDensity, 0) / rows.length;

  return {
    averageDensity,
    buckets,
    rows,
    totalRecords: rawData.length,
  };
}

/** @param {number} density */
export function getDensityHeatmapColor(density) {
  if (density <= 0) return 'var(--g3-color__silver)';
  return interpolateYlGnBu(Math.min(1, Math.max(0.12, density)));
}

/** @param {number} density */
export function formatDensityPercentage(density) {
  return `${Math.round(density * 100)}%`;
}