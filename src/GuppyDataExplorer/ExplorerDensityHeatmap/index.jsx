import PropTypes from 'prop-types';
import './ExplorerDensityHeatmap.css';

/**
 * @typedef {Object} ExplorerDensityHeatmapProps
 * @property {string[]} fields
 * @property {number} accessibleCount
 * @property {number} totalCount
 */

/** @param {ExplorerDensityHeatmapProps} props */
function ExplorerDensityHeatmap({
  fields = [],
  accessibleCount = 0,
  totalCount = 0,
}) {
  return (
    <section className='explorer-density-heatmap'>
      <div className='explorer-density-heatmap__header'>
        <div>
          <h2 className='explorer-density-heatmap__title'>Data density heatmap</h2>
          <p className='explorer-density-heatmap__description'>
            Completeness across the active dataset slice, grouped by the
            configured explorer fields.
          </p>
        </div>
        <div className='explorer-density-heatmap__summary'>
          <div>
            <span className='explorer-density-heatmap__summary-value'>
              {totalCount.toLocaleString()}
            </span>
            <span className='explorer-density-heatmap__summary-label'>
              total records
            </span>
          </div>
          <div>
            <span className='explorer-density-heatmap__summary-value'>
              {accessibleCount.toLocaleString()}
            </span>
            <span className='explorer-density-heatmap__summary-label'>
              accessible
            </span>
          </div>
          <div>
            <span className='explorer-density-heatmap__summary-value'>
              {fields.length.toLocaleString()}
            </span>
            <span className='explorer-density-heatmap__summary-label'>
              fields
            </span>
          </div>
        </div>
      </div>

      <div className='explorer-density-heatmap__placeholder'>
        <p className='explorer-density-heatmap__placeholder-text'>
          Data density heatmap will be rendered here.
        </p>
        <p className='explorer-density-heatmap__placeholder-note'>
          A follow-up will retrieve field-level completeness data using
          aggregation queries and render the full heatmap visualization.
        </p>
      </div>
    </section>
  );
}

ExplorerDensityHeatmap.propTypes = {
  accessibleCount: PropTypes.number,
  fields: PropTypes.array,
  totalCount: PropTypes.number,
};

export default ExplorerDensityHeatmap;