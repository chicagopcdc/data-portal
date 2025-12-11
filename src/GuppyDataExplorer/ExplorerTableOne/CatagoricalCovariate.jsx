import { useState } from 'react';
import './CatagoricalCovariate.css';

export default function CatagorialCovariate({
  postion,
  covariate,
  updateCovariates,
}) {
  const [showAllValues, setShowAllValues] = useState(false);
  return covariate.values ? (
    <div
      className={`covar_card_catagorical_container ${
        !covariate.selectedKeys || covariate.selectedKeys.length === 0
          ? 'covar_card_catagorical_container--empty'
          : ''
      }`}
    >
      <div className='covar_card_catagorical_header'>
        <span className='covar_card_check_label'>Values:</span>
        <div>
          {covariate.values.length > 5 && (
            <button
              type='button'
              className='covar_card_toggle_button'
              onClick={() => setShowAllValues(!showAllValues)}
            >
              {showAllValues
                ? 'Show Less'
                : `Show All (${covariate.values.length})`}
            </button>
          )}
          <button
            type='button'
            className='covar_card_toggle_button'
            onClick={() => {
              const allValues = covariate.values;
              const currentSelectedKeys = covariate.selectedKeys || [];
              const allSelected =
                allValues.length === currentSelectedKeys.length;

              updateCovariates((prevCovariates) => {
                const newCovariates = [...prevCovariates];
                const currentCovariate = { ...newCovariates[postion] };

                if (allSelected) {
                  currentCovariate.selectedKeys = [];
                } else {
                  currentCovariate.selectedKeys = [...allValues];
                }

                newCovariates[postion] = currentCovariate;
                return newCovariates;
              });
            }}
          >
            {(covariate.selectedKeys || []).length === covariate.values.length
              ? 'Unselect All'
              : 'Select All'}
          </button>
        </div>
      </div>
      <div className='covar_card_check_list'>
        {(showAllValues ? covariate.values : covariate.values.slice(0, 5)).map(
          (k) => {
            return (
              <label className='covar_card_check_item' key={k.toString()}>
                <input
                  type='checkbox'
                  value={k}
                  className='covar_card_checkbox'
                  checked={covariate.selectedKeys?.includes(k) || false}
                  onChange={(e) => {
                    var v = e.target.value;
                    updateCovariates((prevCovariates) => {
                      const newCovariates = [...prevCovariates];
                      const currentCovariate = { ...newCovariates[postion] };
                      const selectedKeys = currentCovariate.selectedKeys || [];

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
          },
        )}
      </div>
    </div>
  ) : null;
}
