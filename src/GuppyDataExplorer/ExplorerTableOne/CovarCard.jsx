import { useState } from 'react';
import { overrideSelectTheme } from '../../utils';
import './ExplorerTableOne.css';
import Select from 'react-select';
import Button from '../../gen3-ui-component/components/Button';
import '../ExplorerSurvivalAnalysis/ExplorerSurvivalAnalysis.css';

export default function CovarCard({
  postion,
  covariates,
  updateCovariates,
  selectedCovariates,
  setSelectedCovariates,
  option,
}) {
  const [showAllValues, setShowAllValues] = useState(false);
  const filterFinderOptions = Object.keys(option).map((group) => ({
    label: group,
    options: option[group].map((item) => ({
      label: item.name,
      value: item, // Store the whole dictionary object as value
      isDisabled: selectedCovariates.has(item.name), // Disable if already selected
    })),
  }));

  return (
    <div className='explorer-survival-analysis__filter-set-card'>
      <h2>Covariate {postion + 1}</h2>
      <div className='covar_card_form_controls'>
        <Select
          className='g3-filter-group__filter-finder'
          placeholder='Find filter to use'
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
          isOptionDisabled={(option) => option.isDisabled} // This disables the option
        />
      </div>

      {covariates[postion].type == 'categorical' &&
      covariates[postion].values ? (
        <div className='covar_card_check_group'>
          <div className='covar_card_check_header'>
            <span className='covar_card_check_label'>Values:</span>
            {covariates[postion].values.length > 5 && (
              <button
                type='button'
                className='covar_card_toggle_button'
                onClick={() => setShowAllValues(!showAllValues)}
              >
                {showAllValues
                  ? 'Show Less'
                  : `Show All (${covariates[postion].values.length})`}
              </button>
            )}
          </div>
          <div className='covar_card_check_list'>
            {(showAllValues
              ? covariates[postion].values
              : covariates[postion].values.slice(0, 5)
            ).map((k) => {
              return (
                <label className='covar_card_check_item' key={k.toString()}>
                  <input
                    type='checkbox'
                    value={k}
                    className='covar_card_checkbox'
                    checked={
                      covariates[postion].selectedKeys?.includes(k) || false
                    }
                    onChange={(e) => {
                      var v = e.target.value;
                      updateCovariates((prevCovariates) => {
                        const newCovariates = [...prevCovariates];
                        const currentCovariate = { ...newCovariates[postion] };
                        const selectedKeys =
                          currentCovariate.selectedKeys || [];

                        if (e.target.checked) {
                          currentCovariate.selectedKeys = [...selectedKeys, v];
                        } else {
                          currentCovariate.selectedKeys = selectedKeys.filter(
                            (key) => key !== v,
                          );
                        }

                        newCovariates[postion] = currentCovariate;
                        return newCovariates;
                      });
                    }}
                  />
                  <span className='covar_card_check_text'>{k}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <Button
        label='delete'
        buttonType='primary'
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
      />
    </div>
  );
}
