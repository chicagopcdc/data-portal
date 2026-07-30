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
  const sourceFields =
    configuredFields.length > 0 ? configuredFields : allFields;

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

/**
 * Extracts field names that have active filter selections from an
 * ExplorerFilter (StandardFilterState) object.
 *
 * Handles:
 *  - OPTION filters  → selectedValues with length > 0
 *  - RANGE  filters  → presence of lowerBound / upperBound
 *  - ANCHORED filters → recursively extracts nested field names
 *
 * @param {object} filterObj  The explorer filter object ({ __type, value })
 * @returns {string[]}        Deduplicated list of actively-filtered field names
 */
export function extractFieldsFromFilter(filterObj) {
  const fields = [];

  if (!filterObj || typeof filterObj !== 'object' || !filterObj.value) {
    return fields;
  }

  // For COMPOSED filters we cannot meaningfully extract field names
  if (filterObj.__type === 'COMPOSED') {
    return fields;
  }

  const entries = filterObj.value;
  if (typeof entries !== 'object') return fields;

  for (const [fieldName, fieldFilter] of Object.entries(entries)) {
    if (fieldFilter && typeof fieldFilter === 'object') {
      // ANCHORED filter — recurse into its nested value map
      if (fieldFilter.__type === 'ANCHORED') {
        if (fieldFilter.value && typeof fieldFilter.value === 'object') {
          for (const nestedField of Object.keys(fieldFilter.value)) {
            const nested = fieldFilter.value[nestedField];
            if (nested && typeof nested === 'object') {
              const hasSelected =
                Array.isArray(nested.selectedValues) &&
                nested.selectedValues.length > 0;
              const hasRange =
                nested.lowerBound !== undefined ||
                nested.upperBound !== undefined;
              if (hasSelected || hasRange) {
                fields.push(nestedField);
              }
            }
          }
        }
      } else if (
        Array.isArray(fieldFilter.selectedValues) &&
        fieldFilter.selectedValues.length > 0
      ) {
        // OPTION filter
        fields.push(fieldName);
      } else if (
        // RANGE filter
        fieldFilter.lowerBound !== undefined ||
        fieldFilter.upperBound !== undefined
      ) {
        fields.push(fieldName);
      }
    }
  }

  // deduplicate while preserving insertion order
  return [...new Set(fields)];
}

const COLOR_ROSE = '#e74c3c';
const COLOR_BEE = '#f4b940';
const COLOR_LIME = '#7ec500';

function interpolateColor(color1, color2, factor) {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** @param {number} density */
export function getDensityHeatmapColor(density) {
  if (density <= 0) return 'var(--g3-color__silver)';
  const clamped = Math.min(1, Math.max(0, density));
  if (clamped < 0.5) {
    return interpolateColor(COLOR_ROSE, COLOR_BEE, clamped * 2);
  }
  return interpolateColor(COLOR_BEE, COLOR_LIME, (clamped - 0.5) * 2);
}

/** @param {number} density */
export function formatDensityPercentage(density) {
  const percent = density * 100;
  const formatted = +percent.toFixed(2);
  return `${formatted}%`;
}
