import { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SimpleInputField from '../../components/SimpleInputField';
import Button from '../../gen3-ui-component/components/Button';
import ExplorerFilterDisplay from '../ExplorerFilterDisplay';
import './ExplorerFilterSetForms.css';
import { isFilterSetSaved } from '../utils';


/** @typedef {import('../types').ExplorerFilterSet} ExplorerFilterSet */

/**
 * @param {Object} prop
 * @param {ExplorerFilterSet} prop.currentFilterSet
 * @param {ExplorerFilterSet['filter']} prop.currentFilter
 * @param {ExplorerFilterSet[]} prop.filterSets
 * @param {boolean} [prop.isFiltersChanged]
 * @param {boolean} [prop.isRenameOnly]
 * @param {(updated: ExplorerFilterSet) => void} prop.onAction
 * @param {() => void} prop.onClose
 */
function FilterSetUpdateForm({
  currentFilterSet,
  currentFilter,
  filterSets,
  isFiltersChanged,
  isRenameOnly,
  onAction,
  onClose,
}) {
  const [filterSet, setFilterSet] = useState(currentFilterSet);
  const [error, setError] = useState({ isError: false, message: '' });
  function validate() {
    if (filterSet.name === '')
      setError({ isError: true, message: 'Name is required!' });
    else if (
      filterSets.filter(
        (c) => c.name === filterSet.name && c.name !== currentFilterSet.name
      ).length > 0
    )
      setError({ isError: true, message: 'Name is already in use!' });
    else setError({ isError: false, message: '' });
  }
  return (
    <div className='explorer-filter-set-form'>
      {isRenameOnly ? 
          <h4>Rename current Filter Set</h4>
        : <>
            <h4>Save changes to the current Filter Set</h4>
            {isFiltersChanged && (
              <p>
                <FontAwesomeIcon
                  icon='triangle-exclamation'
                  color='var(--pcdc-color__secondary)'
                />{' '}
                You have changed filters for this Filter Set.
              </p>
            )}
          </>
      } 
      <form onSubmit={(e) => e.preventDefault()}>
        <SimpleInputField
          label='Name'
          input={
            <input
              id='update-ohort-name'
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              placeholder='Enter the Filter Set name'
              value={filterSet.name}
              onBlur={validate}
              onChange={(e) => {
                e.persist();
                setFilterSet({ ...filterSet, name: e.target.value });
              }}
            />
          }
          error={error}
        />
        {!isRenameOnly ? 
          <>
            <SimpleInputField
              label='Description'
              input={
                <textarea
                  id='update-filter-set-description'
                  placeholder='Describe the Filter Set (optional)'
                  value={filterSet.description}
                  onChange={(e) => {
                    e.persist();
                    const newFilterSet = { ...filterSet, description: e.target.value };
                    if (isFilterSetSaved(newFilterSet)) {
                      setFilterSet(newFilterSet);
                    }
                  }}
                />
              }
            />
            <ExplorerFilterDisplay filter={filterSet.filter} />
            {isFiltersChanged && (
              <ExplorerFilterDisplay
                filter={currentFilter}
                title='Filters (changed)'
              />
            )}
          </>
          : null
        }
      </form>
      <div>
        <Button buttonType='default' label='Back to page' onClick={onClose} />
        <Button
          label='Save changes'
          enabled={
            (isFiltersChanged ||
              filterSet.name !== currentFilterSet.name ||
              filterSet.description !== currentFilterSet.description) &&
            !error.isError
          }
          onClick={() => onAction({ ...filterSet, filter: currentFilter })}
        />
      </div>
    </div>
  );
}

FilterSetUpdateForm.propTypes = {
  currentFilterSet: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    filter: PropTypes.object,
    id: PropTypes.number,
  }),
  currentFilter: PropTypes.object,
  filterSets: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      filter: PropTypes.object,
      id: PropTypes.number,
    })
  ),
  isFiltersChanged: PropTypes.bool,
  onAction: PropTypes.func,
  onClose: PropTypes.func,
};

export default FilterSetUpdateForm;
