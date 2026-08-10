import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { capitalizeFirstLetter } from '../../utils';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  loadDensityHeatmap,
  prioritizeDensityHeatmapCategory,
} from '../../redux/explorer/densityHeatmapThunks';
import UserAgreement from '../ExplorerSurvivalAnalysis/UserAgreement';

import {
  extractFieldsFromFilter,
  formatDensityPercentage,
  getDensityHeatmapFieldLabel,
  groupFieldPathsByCategory,
} from './utils';
import './ExplorerDensityHeatmap.css';

const userAgreementLocalStorageKey = 'densityHeatmap:userAgreement';

function checkUserAgreement() {
  return window.localStorage.getItem(userAgreementLocalStorageKey) === 'true';
}

function handleUserAgreement() {
  return window.localStorage.setItem(userAgreementLocalStorageKey, 'true');
}

/**
 * @typedef {Object} ExplorerDensityHeatmapProps
 * @property {string[]} fields
 * @property {string[]} [primaryFields]
 * @property {boolean} [expandByFilter]
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
  totalCount = 0,
  filter = {},
  dataType,
  fieldInfo = {},
}) {
  const dispatch = useAppDispatch();
  const [isUserCompliant, setIsUserCompliant] = useState(checkUserAgreement());
  const [showAllFields, setShowAllFields] = useState(false);
  const sectionObserverRef = useRef(/** @type {IntersectionObserver | null} */ (null));
  const sectionNodeMapRef = useRef(/** @type {Map<string, Element>} */ (new Map()));

  const guppyConfigDataType = useAppSelector(
    (state) => state.explorer.config.guppyConfig.dataType,
  );
  const densityHeatmapResult = useAppSelector(
    (state) => state.explorer.densityHeatmapResult,
  );
  const activeDataType = dataType || guppyConfigDataType;
  const propFieldPaths = useMemo(
    () => fields.map((field) => String(field)),
    [fields],
  );

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
    if (showAllFields || !hasPrimaryFields) {
      return propFieldPaths;
    }

    const combined = new Set([...primaryFields]);
    secondaryFields.forEach((f) => combined.add(f));

    const available = new Set(propFieldPaths);

    return [...combined].filter((path) => available.has(path));
  }, [
    hasPrimaryFields,
    primaryFields,
    propFieldPaths,
    secondaryFields,
    showAllFields,
  ]);

  useEffect(() => {
    if (!isUserCompliant) return undefined;

    dispatch(
      loadDensityHeatmap({
        dataType: activeDataType,
        fieldPaths,
        filter,
        totalCount,
      }),
    );

    return undefined;
  }, [
    activeDataType,
    dispatch,
    fieldPaths,
    filter,
    isUserCompliant,
    totalCount,
  ]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    sectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const categoryKey = /** @type {HTMLElement} */ (entry.target).dataset
            .categoryKey;
          if (categoryKey) prioritizeDensityHeatmapCategory(categoryKey);
        });
      },
      { root: null, rootMargin: '120px 0px', threshold: 0.01 },
    );

    sectionNodeMapRef.current.forEach((node) => {
      sectionObserverRef.current?.observe(node);
    });

    return () => {
      sectionObserverRef.current?.disconnect();
      sectionObserverRef.current = null;
    };
  }, []);

  /**
   * @param {string} categoryKey
   * @param {HTMLElement | null} node
   */
  function bindSectionNode(categoryKey, node) {
    const previous = sectionNodeMapRef.current.get(categoryKey);
    if (previous && previous !== node) {
      sectionObserverRef.current?.unobserve(previous);
      sectionNodeMapRef.current.delete(categoryKey);
    }
    if (node) {
      sectionNodeMapRef.current.set(categoryKey, node);
      sectionObserverRef.current?.observe(node);
    }
  }

  const densityRows = useMemo(
    () =>
      fieldPaths
        .map((fieldPath) => densityHeatmapResult.rowsByField[fieldPath])
        .filter(Boolean),
    [densityHeatmapResult.rowsByField, fieldPaths],
  );

  const stats = useMemo(
    () => [
      { label: 'total records', value: totalCount },
      { label: 'fields tracked', value: fieldPaths.length },
    ],
    [fieldPaths.length, totalCount],
  );

  const secondaryFieldSet = useMemo(
    () => new Set(secondaryFields),
    [secondaryFields],
  );

  /**
   * Stable category-ordered sections (loaded rows or skeleton placeholders).
   * Order follows fieldPaths grouping so sections do not jump as batches arrive.
   */
  const matrixSections = useMemo(() => {
    /**
     * @param {string[]} partitionFields
     * @param {'all' | 'primary' | 'secondary' | 'expanded'} sectionType
     */
    function buildSections(partitionFields, sectionType) {
      if (partitionFields.length === 0) return [];

      return groupFieldPathsByCategory(partitionFields).map(
        ({ key, fields }) => {
          const rows = fields
            .map((fieldPath) => densityHeatmapResult.rowsByField[fieldPath])
            .filter(Boolean);
          const status =
            densityHeatmapResult.categoryStatus[key] || 'pending';

          if (rows.length > 0) {
            return {
              key,
              label: capitalizeFirstLetter(key.split('_').join(' ')),
              rows: rows.map((row) => ({ ...row, groupKey: key })),
              sectionType,
              status: 'loaded',
              fieldCount: fields.length,
            };
          }

          return {
            key,
            label: capitalizeFirstLetter(key.split('_').join(' ')),
            rows: [],
            sectionType,
            status,
            fieldCount: fields.length,
          };
        },
      );
    }

    if (!hasPrimaryFields || showAllFields) {
      return buildSections(fieldPaths, 'all');
    }

    const primaryPartition = fieldPaths.filter((field) =>
      primaryFieldSet.has(field),
    );
    const secondaryPartition = fieldPaths.filter(
      (field) =>
        secondaryFieldSet.has(field) && !primaryFieldSet.has(field),
    );
    const expandedPartition = fieldPaths.filter(
      (field) =>
        !primaryFieldSet.has(field) && !secondaryFieldSet.has(field),
    );

    return [
      ...buildSections(primaryPartition, 'primary'),
      ...buildSections(secondaryPartition, 'secondary'),
      ...buildSections(expandedPartition, 'expanded'),
    ];
  }, [
    densityHeatmapResult.categoryStatus,
    densityHeatmapResult.rowsByField,
    fieldPaths,
    hasPrimaryFields,
    primaryFieldSet,
    secondaryFieldSet,
    showAllFields,
  ]);

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

  const hasLoadedRows = densityRows.length > 0;
  const isBootstrapping =
    densityHeatmapResult.isPending &&
    !hasLoadedRows &&
    matrixSections.length === 0 &&
    !densityHeatmapResult.error;
  const showFatalError =
    !hasLoadedRows &&
    !!densityHeatmapResult.error &&
    !densityHeatmapResult.isPending;

  let heatmapContent = null;
  if (isBootstrapping) {
    heatmapContent = (
      <div className='explorer-density-heatmap__state'>
        Loading categories...
      </div>
    );
  } else if (showFatalError) {
    heatmapContent = (
      <div className='explorer-density-heatmap__state explorer-density-heatmap__state--error'>
        {densityHeatmapResult.error}
      </div>
    );
  } else if (matrixSections.length > 0) {
    heatmapContent = matrixSections.map((group) => {
      const isLoaded = group.status === 'loaded';
      const sectionRefKey = `${group.sectionType}-${group.key}`;

      return (
        <div
          className={`explorer-density-heatmap__section${
            group.sectionType === 'secondary'
              ? ' explorer-density-heatmap__section--secondary'
              : ''
          }${
            isLoaded
              ? ''
              : ` explorer-density-heatmap__section--${group.status}`
          }`}
          data-category-key={group.key}
          key={sectionRefKey}
          ref={(node) => bindSectionNode(sectionRefKey, node)}
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
              {isLoaded
                ? `${group.rows.length} field${
                    group.rows.length === 1 ? '' : 's'
                  }`
                : group.status === 'error'
                  ? 'Failed to load'
                  : `Loading ${group.fieldCount} field${
                      group.fieldCount === 1 ? '' : 's'
                    }...`}
            </span>
          </div>

          {isLoaded ? (
            group.rows.map((row) => (
              <div className='explorer-density-heatmap__row' key={row.field}>
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
                  <span>{row.availableCount.toLocaleString()} available</span>
                  <span>{row.missingCount.toLocaleString()} missing</span>
                </div>
              </div>
            ))
          ) : (
            <div
              className='explorer-density-heatmap__section-skeleton'
              aria-hidden
            >
              <div className='explorer-density-heatmap__skeleton-row' />
              <div className='explorer-density-heatmap__skeleton-row' />
              <div className='explorer-density-heatmap__skeleton-row' />
            </div>
          )}
        </div>
      );
    });
  } else {
    heatmapContent = (
      <div className='explorer-density-heatmap__state'>
        No density data available for the configured fields.
      </div>
    );
  }

  return (
    <section className='explorer-density-heatmap'>
      {isUserCompliant ? (
        <div className='explorer-visualization__charts explorer-density-heatmap__panel'>
          <div className='explorer-density-heatmap__header'>
            <div>
              <h2 className='explorer-density-heatmap__title'>
                Data density heatmap
              </h2>
              <p className='explorer-density-heatmap__description'>
                Field availability and completeness across the dataset
              </p>
              {densityHeatmapResult.isPending && hasLoadedRows && (
                <p className='explorer-density-heatmap__progress'>
                  Loading categories in the background (
                  {densityHeatmapResult.loadedCount}/
                  {densityHeatmapResult.totalCategories})
                </p>
              )}
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

            {heatmapContent}
          </div>
        </div>
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
  dataType: PropTypes.string,
  expandByFilter: PropTypes.bool,
  fieldInfo: PropTypes.object,
  filter: PropTypes.object,
  fields: PropTypes.array,
  primaryFields: PropTypes.arrayOf(PropTypes.string),
  totalCount: PropTypes.number,
};

export default ExplorerDensityHeatmap;
