import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { capitalizeFirstLetter } from '../../utils';
import { useAppSelector } from '../../redux/hooks';
import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import { fetchWithCreds } from '../../utils.fetch';
import { guppyGraphQLUrl } from '../../localconf';
import UserAgreement from '../ExplorerSurvivalAnalysis/UserAgreement';

import {
  extractFieldsFromFilter,
  formatDensityPercentage,
  getDensityHeatmapFieldLabel,
} from './utils';
import './ExplorerDensityHeatmap.css';

const userAgreementLocalStorageKey = 'densityHeatmap:userAgreement';

function checkUserAgreement() {
  return window.localStorage.getItem(userAgreementLocalStorageKey) === 'true';
}

function handleUserAgreement() {
  return window.localStorage.setItem(userAgreementLocalStorageKey, 'true');
}

function buildSelectionTree(fieldPaths) {
  const root = {};

  fieldPaths.forEach((fieldPath) => {
    const segments = fieldPath.split('.').filter(Boolean);
    let cursor = root;

    segments.forEach((segment, index) => {
      if (!cursor[segment]) {
        cursor[segment] = {};
      }

      if (index === segments.length - 1) {
        cursor[segment].__leaf = true;
        return;
      }

      cursor = cursor[segment];
    });
  });

  return root;
}

function renderSelectionTree(tree, depth = 0) {
  const indent = '  '.repeat(depth);

  return Object.entries(tree)
    .map(([fieldName, child]) => {
      const childEntries = Object.keys(child).filter((key) => key !== '__leaf');

      if (child.__leaf || childEntries.length === 0) {
        return `${indent}${fieldName} { histogram { key count } }`;
      }

      return `${indent}${fieldName} {
${renderSelectionTree(child, depth + 1)}
${indent}}`;
    })
    .join('\n');
}

function collectHistogramCount(node) {
  if (node === null || node === undefined) {
    return 0;
  }

  if (Array.isArray(node)) {
    return node.reduce((sum, value) => sum + collectHistogramCount(value), 0);
  }

  if (typeof node !== 'object') {
    return 0;
  }

  let total = 0;
  if (Array.isArray(node.histogram)) {
    total += node.histogram.reduce(
      (sum, bucket) => sum + Math.max(bucket?.count ?? 0, 0),
      0,
    );
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      total += collectHistogramCount(value);
    }
  }

  return total;
}


/**
 * @typedef {Object} ExplorerDensityHeatmapProps
 * @property {string[]} fields
 * @property {string[]} [primaryFields]
 * @property {boolean} [expandByFilter]
 * @property {number} accessibleCount
 * @property {number} totalCount
 * @property {object} filter
 * @property {string} dataType
 * @property {object} [fieldInfo]
 */

/** @param {ExplorerDensityHeatmapProps} props */
function ExplorerDensityHeatmap({
  fields = [],
  primaryFields = [],
  expandByFilter = false,
  accessibleCount = 0,
  totalCount = 0,
  filter = {},
  dataType,
  fieldInfo = {},
}) {
  const [isUserCompliant, setIsUserCompliant] = useState(checkUserAgreement());
  const [densityRows, setDensityRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  const guppyConfigDataType = useAppSelector(
    (state) => state.explorer.config.guppyConfig.dataType,
  );
  const activeDataType = dataType || guppyConfigDataType;
  const propFieldPaths = useMemo(
    () => fields.map((field) => String(field)),
    [fields],
  );

  // Extract field names from active filter selections
  const secondaryFields = useMemo(
    () => (expandByFilter ? extractFieldsFromFilter(filter) : []),
    [expandByFilter, filter],
  );

  const primaryFieldSet = useMemo(
    () => new Set(primaryFields),
    [primaryFields],
  );

  const hasPrimaryFields = primaryFields.length > 0;

  const fieldPaths = useMemo(() => {
    // If showAllFields or no primary fields configured, use all available fields
    if (showAllFields || !hasPrimaryFields) {
      return propFieldPaths;
    }

    // Combine primary + secondary (filter-derived) fields
    const combined = new Set([...primaryFields]);
    secondaryFields.forEach((f) => combined.add(f));

    // Filter by what's actually available in the schema
    const available = new Set(propFieldPaths);

    return [...combined].filter((path) => available.has(path));
  }, [
    hasPrimaryFields,
    primaryFields,
    propFieldPaths,
    secondaryFields,
    showAllFields,
  ]);


  const fieldQuery = useMemo(() => {
    if (!fieldPaths.length) return '';

    return renderSelectionTree(buildSelectionTree(fieldPaths));
  }, [fieldPaths]);

  useEffect(() => {
    if (!isUserCompliant || !fieldQuery || !activeDataType) {
      setDensityRows([]);
      setError('');
      return undefined;
    }

    let isCancelled = false;

    async function loadDensityData() {
      setIsLoading(true);
      setError('');

      try {
        const query = `query ($filter_main: JSON) {
          _aggregation {
            main: ${activeDataType}(filter: $filter_main, accessibility: all) {
              ${fieldQuery}
            }
          }
        }`;
        const body = {
          query,
          variables: { filter_main: getGQLFilter(filter) ?? {} },
        };
        const response = await fetchWithCreds({
          path: guppyGraphQLUrl,
          method: 'POST',
          body: JSON.stringify(body),
        });
        const aggregation = response?.data?.data?._aggregation?.main;
        const nextRows = fieldPaths.map((fieldPath) => {
          const selection = fieldPath
            .split('.')
            .filter(Boolean)
            .reduce((current, segment) => current?.[segment], aggregation);
          const availableCount = collectHistogramCount(selection);
          const completeness =
            totalCount > 0 ? Math.min(availableCount / totalCount, 1) : 0;

          return {
            availableCount,
            completeness,
            field: fieldPath,
            missingCount: Math.max(totalCount - availableCount, 0),
          };
        });

        if (!isCancelled) {
          setDensityRows(nextRows);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Unable to load density data from the GraphQL API.');
          setDensityRows([]);
        }
        console.error(err); // eslint-disable-line no-console
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDensityData();

    return () => {
      isCancelled = true;
    };
  }, [
    activeDataType,
    fieldPaths,
    fieldQuery,
    filter,
    isUserCompliant,
    totalCount,
  ]);

  const stats = useMemo(
    () => [
      { label: 'total records', value: totalCount },
      { label: 'fields tracked', value: fieldPaths.length },
    ],
    [fieldPaths.length, totalCount],
  );

  /** Groups density rows by top-level field prefix, then wraps them in sections */
  function groupRows(rows) {
    const groups = [];
    const groupIndex = new Map();

    rows.forEach((row) => {
      const groupKey = row.field.split('.')[0] || row.field;
      if (!groupIndex.has(groupKey)) {
        groupIndex.set(groupKey, groups.length);
        groups.push({ key: groupKey, rows: [] });
      }

      groups[groupIndex.get(groupKey)].rows.push({
        ...row,
        groupKey,
      });
    });

    return groups.map((group) => ({
      ...group,
      label: capitalizeFirstLetter(group.key.split('_').join(' ')),
    }));
  }

  const secondaryFieldSet = useMemo(
    () => new Set(secondaryFields),
    [secondaryFields],
  );

  const groupedDensityRows = useMemo(() => {
    // When there are no primary fields (or showAllFields is on),
    // fall back to the original flat grouping
    if (!hasPrimaryFields || showAllFields) {
      const allGroups = groupRows(densityRows);
      return allGroups.map((g) => ({ ...g, sectionType: 'all' }));
    }

    // Partition rows into primary, secondary, and expanded
    const primaryRows = [];
    const secondaryRows = [];
    const expandedRows = [];

    densityRows.forEach((row) => {
      if (primaryFieldSet.has(row.field)) {
        primaryRows.push(row);
      } else if (secondaryFieldSet.has(row.field)) {
        secondaryRows.push(row);
      } else {
        expandedRows.push(row);
      }
    });

    const sections = [];

    if (primaryRows.length > 0) {
      groupRows(primaryRows).forEach((g) =>
        sections.push({ ...g, sectionType: 'primary' }),
      );
    }

    if (secondaryRows.length > 0) {
      groupRows(secondaryRows).forEach((g) =>
        sections.push({ ...g, sectionType: 'secondary' }),
      );
    }

    if (expandedRows.length > 0) {
      groupRows(expandedRows).forEach((g) =>
        sections.push({ ...g, sectionType: 'expanded' }),
      );
    }

    return sections;
  }, [
    densityRows,
    hasPrimaryFields,
    primaryFieldSet,
    secondaryFieldSet,
    showAllFields,
  ]);

  /** How many total fields are available from the schema mapping */
  const allFieldCount = propFieldPaths.length;

  const canShowToggle =
    hasPrimaryFields && allFieldCount > primaryFields.length;

  function getFieldLabel(fieldPath) {
    return getDensityHeatmapFieldLabel(fieldPath, fieldInfo);
  }

  /** Returns a section-level heading label based on section type */
  function getSectionLabel(group) {
    if (group.sectionType === 'secondary') return 'Filter-related fields';
    return group.label;
  }

  return (
    <section className='explorer-density-heatmap'>
      {isUserCompliant ? (
        <>
          <div className='explorer-visualization__charts explorer-density-heatmap__panel'>
            <div className='explorer-density-heatmap__header'>
              <div>
                <h2 className='explorer-density-heatmap__title'>
                  Data density heatmap
                </h2>
                <p className='explorer-density-heatmap__description'>
                  Field availability and completeness across the dataset
                </p>
              </div>
              <div className='explorer-density-heatmap__header-right'>
                {canShowToggle && (
                  <button
                    className='explorer-density-heatmap__show-all-toggle'
                    onClick={() => setShowAllFields((prev) => !prev)}
                    type='button'
                  >
                    {showAllFields
                      ? 'Show curated fields only'
                      : `Show all fields (${allFieldCount})`}
                  </button>
                )}
                <div className='explorer-density-heatmap__summary'>
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <span className='explorer-density-heatmap__summary-value'>
                        {stat.value.toLocaleString()}
                      </span>
                      <span className='explorer-density-heatmap__summary-label'>
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='explorer-density-heatmap__legend'>
              <span>low completeness</span>
              <div className='explorer-density-heatmap__legend-gradient' />
              <span>high completeness</span>
            </div>

            <div className='explorer-density-heatmap__matrix'>
              <div className='explorer-density-heatmap__matrix-header'>
                <span>Field</span>
                <span className='explorer-density-heatmap__header-density'>
                  Density
                </span>
                <span className='explorer-density-heatmap__header-summary'>
                  Summary
                </span>
              </div>

              {isLoading ? (
                <div className='explorer-density-heatmap__state'>
                  Loading...
                </div>
              ) : error ? (
                <div className='explorer-density-heatmap__state explorer-density-heatmap__state--error'>
                  {error}
                </div>
              ) : groupedDensityRows.length > 0 ? (
                groupedDensityRows.map((group) => (
                  <div
                    className={`explorer-density-heatmap__section${
                      group.sectionType === 'secondary'
                        ? ' explorer-density-heatmap__section--secondary'
                        : ''
                    }`}
                    key={`${group.sectionType}-${group.key}`}
                  >
                    <div className='explorer-density-heatmap__section-header'>
                      <h3 className='explorer-density-heatmap__section-title'>
                        {getSectionLabel(group)}
                        {group.sectionType === 'secondary' && (
                          <span className='explorer-density-heatmap__badge'>
                            Active Filters
                          </span>
                        )}
                      </h3>
                      <span className='explorer-density-heatmap__section-count'>
                        {group.rows.length} field
                        {group.rows.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {group.rows.map((row) => (
                      <div
                        className='explorer-density-heatmap__row'
                        key={row.field}
                      >
                        <div className='explorer-density-heatmap__field-name'>
                          {getFieldLabel(row.field)}
                          <span className='explorer-density-heatmap__field-path'>
                            {row.field}
                          </span>
                        </div>

                        <div
                          className='explorer-density-heatmap__strip'
                          aria-label={`${row.field} completeness ${formatDensityPercentage(row.completeness)}`}
                        >
                          <div
                            className='explorer-density-heatmap__strip-fill'
                            style={{
                              clipPath: `inset(0 ${100 - row.completeness * 100}% 0 0)`,
                            }}
                          />
                        </div>

                        <div className='explorer-density-heatmap__counts'>
                          <span className='explorer-density-heatmap__bar-label'>
                            {formatDensityPercentage(row.completeness)} complete
                          </span>
                          <span>
                            {row.availableCount.toLocaleString()} available
                          </span>
                          <span>
                            {row.missingCount.toLocaleString()} missing
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className='explorer-density-heatmap__state'>
                  No density data available for the configured fields.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <UserAgreement
          onAgree={() => {
            handleUserAgreement();
            setIsUserCompliant(checkUserAgreement());
          }}
        />
      )}
    </section>
  );
}

ExplorerDensityHeatmap.propTypes = {
  accessibleCount: PropTypes.number,
  dataType: PropTypes.string,
  expandByFilter: PropTypes.bool,
  fieldInfo: PropTypes.object,
  filter: PropTypes.object,
  fields: PropTypes.array,
  primaryFields: PropTypes.arrayOf(PropTypes.string),
  totalCount: PropTypes.number,
};

export default ExplorerDensityHeatmap;
