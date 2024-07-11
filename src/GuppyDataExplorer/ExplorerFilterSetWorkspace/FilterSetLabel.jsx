import PropTypes from 'prop-types';
import React from 'react';
import Tooltip from 'rc-tooltip';
import './FilterSetLabel.css';

/** @param {string} value */
function getTextareaAttrs(value) {
  let cols = 10;
  if (value.length > 10)
    if (value.length < 15) cols = 15;
    else if (value.length < 20) cols = 20;
    else cols = 30;

  const maxRows = 8;
  let rows = 2;
  if (value.length > 30)
    rows = Math.min(maxRows, Math.ceil(value.length / cols) + 1);

  return { cols, rows, value };
}

/**
 * @param {Object} props
 * @param {Object} props.filterSet
 * @param {string} [props.filterSet.description]
 * @param {string} [props.filterSet.name]
 * @param {number} [props.filterSet.index]
 * @param {keyof React.JSX.IntrinsicElements} [props.titleTag]
 * @param {boolean} [props.hasTooltip]
 */
function FilterSetLabel({
  filterSet: { description = '', name = '' },
  titleTag,
  hasTooltip = true
}) {
  const Title = titleTag ?? 'span';
  return name === '' ? (
    <Title>Filter</Title>
  ) : (
      hasTooltip ? (
      <Tooltip
        arrowContent={<div className='rc-tooltip-arrow-inner' />}
        overlayStyle={{ maxWidth: 220 }}
        overlay={
          <section className='filter-set-label'>
            <h4>Name</h4>
            <p>{name}</p>
            {description !== '' && (
              <>
                <h4>Description</h4>
                <textarea disabled {...getTextareaAttrs(description)} />
              </>
            )}
          </section>
        }
      >
        <Title>
          {name}
        </Title>
      </Tooltip>
    ) : ( <Title>
      {name}
    </Title>
  ));
}

FilterSetLabel.propTypes = {
  filterSet: PropTypes.shape({
    description: PropTypes.string,
    name: PropTypes.string,
    index: PropTypes.number,
  }),
  titleTag: PropTypes.string,
  hasTooltip: PropTypes.bool
};

export default FilterSetLabel;
