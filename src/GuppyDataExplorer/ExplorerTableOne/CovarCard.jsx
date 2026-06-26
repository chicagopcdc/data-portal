import { overrideSelectTheme } from '../../utils';
import './ExplorerTableOne.css';
import Select from 'react-select';
import './CovarCard.css';
import CatagorialCovariate from './CatagoricalCovariate';
import ContinuousCovariate from './ContinuousCovariate';
export default function CovarCard({
  postion,
  covariates,
  updateCovariates,
  selectedCovariates,
  setSelectedCovariates,
  option,
}) {
  const filterFinderOptions = Object.keys(option).map((group) => ({
    label: group,
    options: option[group].map((item) => ({
      label: item.name,
      value: item, // Store the whole dictionary object as value
      isDisabled: selectedCovariates.has(item.name), // Disable if already selected
    })),
  }));
  return (
    <div className='explorer-table-one__covar-card-card'>
      <header>
        <h2>Covariate {postion + 1}</h2>
        <button
          aria-label='Clear'
          type='button'
          onClick={() => {
            const covariateName = covariates[postion].name;
            setSelectedCovariates((prev) => {
              const newSet = new Set(prev);
              newSet.delete(covariateName);
              return newSet;
            });
            updateCovariates((prevCovariates) => {
              const newCovariates = [...prevCovariates];
              newCovariates.splice(postion, 1);
              return newCovariates;
            });
          }}
        >
          <i className='g3-icon g3-icon--sm g3-icon--cross' />
        </button>
      </header>
      <div className='covar_card_form_controls'>
        <Select
          className='g3-filter-group__filter-finder'
          placeholder='Find Covariate to use'
          onChange={(e) => {
            setSelectedCovariates((prev) => {
              const newSet = new Set(prev);
              newSet.delete(covariates[postion].name); // Remove old covariate
              newSet.add(e.value.name);
              return newSet;
            });
            updateCovariates((prevCovariates) => {
              const newCovariates = [...prevCovariates];
              newCovariates[postion] = {
                label: e.value.label,
                type: e.value.type,
                name: e.value.name,
                values: e.value.values || [],
              };
              return newCovariates;
            });
          }}
          options={filterFinderOptions}
          theme={overrideSelectTheme}
          value={
            'name' in covariates[postion]
              ? { label: covariates[postion].name, value: covariates[postion] }
              : null
          }
          styles={{
            control: (provided, state) => ({
              ...provided,
              backgroundColor:
                !state.hasValue && !state.isFocused
                  ? 'var(--g3-primary-btn__bg-color)'
                  : provided.backgroundColor,
              borderColor:
                !state.hasValue && !state.isFocused
                  ? 'black'
                  : state.isFocused
                    ? 'var(--pcdc-color__primary-light)'
                    : provided.borderColor,
              boxShadow: state.isFocused
                ? '0 0 0 2px rgba(0,0,0,0.06)'
                : provided.boxShadow,
              // Constrain the height to match the button
              height: '40px', // Set specific height
              minHeight: '40px', // Prevent it from getting smaller
              maxHeight: '40px', // Prevent it from getting larger
            }),
            placeholder: (provided, state) => ({
              ...provided,
              color:
                !state.hasValue && !state.isFocused ? 'black' : provided.color,
              fontWeight: 600,
            }),
          }}
        />
      </div>

      {covariates[postion].type == 'categorical' && (
        <CatagorialCovariate
          postion={postion}
          covariate={covariates[postion]}
          updateCovariates={updateCovariates}
        />
      )}

      {covariates[postion].type == 'continuous' ? (
        <ContinuousCovariate
          position={postion}
          covariate={covariates[postion]}
          updateCovariates={updateCovariates}
        />
      ) : null}
    </div>
  );
}
