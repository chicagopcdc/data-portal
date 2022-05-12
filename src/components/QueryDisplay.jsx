import { Fragment } from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap_white.css';
import './QueryDisplay.css';

/**
 * @callback ClickCombineModeHandler
 * @param {'AND' | 'OR'} payload
 */
/**
 * @callback ClickFilterHandler
 * @param {{ anchorField?: string; anchorValue?: string; field: string }} payload
 */

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 * @param {string} [props.filterKey]
 * @param {React.EventHandler<any>} [props.onClick]
 * @param {React.EventHandler<any>} [props.onClose]
 */
function QueryPill({
  className = 'pill',
  children,
  filterKey,
  onClick,
  onClose,
}) {
  return (
    <div className='pill-container'>
      {typeof onClick === 'function' ? (
        <button
          className={className}
          type='button'
          onClick={onClick}
          filter-key={filterKey}
        >
          {children}
        </button>
      ) : (
        <span className={className}>{children}</span>
      )}
      {typeof onClose === 'function' ? (
        <button
          className='pill close'
          type='button'
          onClick={onClose}
          filter-key={filterKey}
        >
          <i className='g3-icon g3-icon--cross g3-icon--sm' />
        </button>
      ) : null}
    </div>
  );
}

QueryPill.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  filterKey: PropTypes.string,
  onClick: PropTypes.func,
  onClose: PropTypes.func,
};

/**
 * @param {Object} props
 * @param {[anchorField: string, anchorValue: string]} [props.anchorInfo]
 * @param {'AND' | 'OR'} [props.combineMode]
 * @param {import('../GuppyComponents/types').FilterState} props.filter
 * @param {import('../GuppyComponents/types').FilterConfig['info']} props.filterInfo
 * @param {ClickCombineModeHandler} [props.onClickCombineMode]
 * @param {ClickFilterHandler} [props.onClickFilter]
 * @param {ClickFilterHandler} [props.onCloseFilter]
 */
function QueryDisplay({
  anchorInfo,
  combineMode,
  filter,
  filterInfo,
  onClickCombineMode,
  onClickFilter,
  onCloseFilter,
}) {
  const filterElements = /** @type {JSX.Element[]} */ ([]);
  const { __combineMode, ...__filter } = filter;
  const queryCombineMode = combineMode ?? __combineMode ?? 'AND';

  const handleClickCombineMode =
    typeof onClickCombineMode === 'function'
      ? () => onClickCombineMode(queryCombineMode)
      : undefined;
  const handleClickFilter =
    typeof onClickFilter === 'function'
      ? (/** @type {React.SyntheticEvent} */ e) => {
          onClickFilter({
            field: e.currentTarget.attributes.getNamedItem('filter-key').value,
            anchorField: anchorInfo?.[0],
            anchorValue: anchorInfo?.[1],
          });
        }
      : undefined;
  const handleCloseFilter =
    typeof onCloseFilter === 'function'
      ? (/** @type {React.SyntheticEvent} */ e) => {
          onCloseFilter({
            field: e.currentTarget.attributes.getNamedItem('filter-key').value,
            anchorField: anchorInfo?.[0],
            anchorValue: anchorInfo?.[1],
          });
        }
      : undefined;

  for (const [key, value] of Object.entries(__filter))
    if ('filter' in value) {
      const [anchorField, anchorValue] = key.split(':');
      filterElements.push(
        <QueryPill key={key} className='pill anchor'>
          <span className='token field'>
            With <code>{filterInfo[anchorField].label}</code> of{' '}
            <code>{`"${anchorValue}"`}</code>
          </span>
          <span className='token'>
            ({' '}
            <QueryDisplay
              anchorInfo={[anchorField, anchorValue]}
              filter={value.filter}
              filterInfo={filterInfo}
              combineMode={__combineMode}
              onClickCombineMode={onClickCombineMode}
              onClickFilter={onClickFilter}
              onCloseFilter={onCloseFilter}
            />{' '}
            )
          </span>
        </QueryPill>
      );
    } else if ('selectedValues' in value) {
      filterElements.push(
        <QueryPill
          key={key}
          onClick={handleClickFilter}
          onClose={handleCloseFilter}
          filterKey={key}
        >
          <span className='token'>
            <code>{filterInfo[key].label}</code>{' '}
            {value.selectedValues.length > 1 ? 'is any of ' : 'is '}
          </span>
          <span className='token'>
            {value.selectedValues.length > 1 ? (
              <Tooltip
                arrowContent={<div className='rc-tooltip-arrow-inner' />}
                overlay={value.selectedValues.map((v) => `"${v}"`).join(', ')}
                placement='bottom'
                trigger={['hover', 'focus']}
              >
                <span>
                  <code>{`"${value.selectedValues[0]}"`}</code>, ...
                </span>
              </Tooltip>
            ) : (
              <code>{`"${value.selectedValues[0]}"`}</code>
            )}
          </span>
        </QueryPill>
      );
    } else {
      filterElements.push(
        <QueryPill
          key={key}
          onClick={handleClickFilter}
          onClose={handleCloseFilter}
          filterKey={key}
        >
          <span className='token'>
            <code>{filterInfo[key].label}</code> is between
          </span>
          <span className='token'>
            <code>
              ({value.lowerBound}, {value.upperBound})
            </code>
          </span>
        </QueryPill>
      );
    }

  return (
    <span className='query-display'>
      {filterElements.map((filterElement, i) => (
        <Fragment key={i}>
          {filterElement}
          {i < filterElements.length - 1 && (
            <QueryPill onClick={handleClickCombineMode}>
              {queryCombineMode}
            </QueryPill>
          )}
        </Fragment>
      ))}
    </span>
  );
}

QueryDisplay.propTypes = {
  anchorInfo: PropTypes.arrayOf(PropTypes.string),
  combineMode: PropTypes.oneOf(['AND', 'OR']),
  filter: PropTypes.any.isRequired,
  filterInfo: PropTypes.objectOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
    })
  ),
  onClickCombineMode: PropTypes.func,
  onClickFilter: PropTypes.func,
  onCloseFilter: PropTypes.func,
};

export default QueryDisplay;