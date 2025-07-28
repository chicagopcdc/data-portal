/* eslint-disable no-shadow */
import { memo, useState } from 'react';
import '../ExplorerSurvivalAnalysis/ExplorerSurvivalAnalysis.css';
import CovarForm from './CovarForm';
import {
  checkUserAgreement,
  handleUserAgreement,
} from '../ExplorerSurvivalAnalysis/utils';
import Spinner from '../../components/Spinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { contactEmail } from '../../localconf';
import UserAgreement from '../ExplorerSurvivalAnalysis/UserAgreement';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateTableOneResult } from '../../redux/explorer/asyncThunks';
/** @typedef {import('./types').UserInputSubmitHandler} UserInputSubmitHandler */

function ExplorerTableOne(tabsOptions) {
  const dispatch = useAppDispatch();

  const {
    tableOneResult: result,
    config: { filterConfig, guppyConfig },
  } = useAppSelector((state) => state.explorer);
  const [isUserCompliant, setIsUserCompliant] = useState(checkUserAgreement());
  const [submittedFilterSetName, setSubmittedFilterSetName] = useState(null);

  /** @type {UserInputSubmitHandler} */
  const handleSubmit = (input) => {
    setSubmittedFilterSetName(input.filterSets[0].name);
    dispatch(
      updateTableOneResult({
        covariates: input.covariates,
        filterSets: input.filterSets,
      }),
    );
  };

  function errorMessage(error) {
    return (
      <div className='explorer-survival-analysis__error'>
        <h1>Unable to generate Table One</h1>
        {error?.message && error.message === 'NOT FOUND' ? (
          <p>
            The Data Portal was unable to generate the table due to insufficient
            data. Please check your filter(s) and try again. You may contact{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) if you need
            further assistance.
          </p>
        ) : (
          <p>
            Please retry by clicking {'"Apply"'} button or refreshing the page.
            If the problem persists, please contact the administrator (
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) for more
            information.
          </p>
        )}
      </div>
    );
  }

  function formatFieldName(field) {
    return field
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function createOptionsList() {
    const options = {};
    // For each tab in filterConfig, add the title as key to options with a value of empty array
    filterConfig.tabs.forEach((tab) => {
      options[tab.title] = [];
      tab.fields.forEach((field) => {
        let selectableValue = {};
        if (field in tabsOptions.tabsOptions) {
          selectableValue = {
            label: field,
            name:
              guppyConfig.fieldMapping.find(
                (mapping) => mapping.field === field,
              )?.name || formatFieldName(field),
          };
          let variableValues = [];
          let type = null;
          const histogram = tabsOptions.tabsOptions[field]?.histogram;
          if (histogram && Array.isArray(histogram) && histogram.length > 0) {
            // Check for continuous: first value.key is array of two numbers
            if (
              histogram.length === 1 &&
              Array.isArray(histogram[0].key) &&
              histogram[0].key.length === 2 &&
              typeof histogram[0].key[0] === 'number' &&
              typeof histogram[0].key[1] === 'number' &&
              histogram[0].key[0] < histogram[0].key[1]
            ) {
              variableValues = histogram[0].key;
              type = 'continuous';
            } else if (!Array.isArray(histogram[0].key)) {
              // categorical: collect all keys
              type = 'categorical';
              histogram.forEach((value) => {
                variableValues.push(value.key);
              });
            } else {
              console.warn(
                `Field ${field} has unrecognized histogram format:`,
                histogram,
              );
              return; // skip this field
            }
            selectableValue.type = type;
            selectableValue.values = variableValues;
            options[tab.title].push(selectableValue);
          }
        }
      });
    });
    return options;
  }

  const options = createOptionsList();

  return (
    <div className='explorer-survival-analysis'>
      {isUserCompliant ? (
        <>
          <div className='explorer-survival-analysis__column-left'>
            <CovarForm onSubmit={handleSubmit} options={options} />
          </div>
          <div className='explorer-survival-analysis__column-right'>
            {result.isPending ? (
              <Spinner />
            ) : (
              <ErrorBoundary fallback={errorMessage()}>
                {result.error ? (
                  errorMessage(result.error)
                ) : (
                  <>
                    {result.data && result.data.variables && (
                      <div className='table-container'>
                        <h2>Table One</h2>
                        <table className='data-table'>
                          <thead>
                            <tr>
                              <th>Covariates</th>
                              <th>{submittedFilterSetName}</th>
                              <th>Everything Else</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Total counts row */}
                            <tr>
                              <td>
                                <strong>Total</strong>
                              </td>
                              <td>{result.data.trueCount}</td>
                              <td>{result.data.totalCount}</td>
                            </tr>

                            {/* Variables rows */}
                            {result.data.variables.map((variable, index) => (
                              <>
                                {/* Missing data row for each variable */}
                                <tr key={`${variable.name}-missing-${index}`}>
                                  <td>
                                    <strong>{variable.name}</strong>
                                  </td>
                                  <td>{variable.missingFromTrue} missing</td>
                                  <td>{variable.missingFromTotal} missing</td>
                                </tr>

                                {/* Categorical variables - render each key as a row */}
                                {variable.type === 'categorical' &&
                                  variable.keys &&
                                  variable.keys.map((key, keyIndex) => (
                                    <tr
                                      key={`${variable.name}-${key.name}-${keyIndex}`}
                                    >
                                      <td style={{ paddingLeft: '20px' }}>
                                        {key.name}
                                      </td>
                                      <td>{key.data.true}</td>
                                      <td>{key.data.total}</td>
                                    </tr>
                                  ))}

                                {/* Continuous variables - render mean row */}
                                {variable.type === 'continuous' &&
                                  variable.mean && (
                                    <tr key={`${variable.name}-mean-${index}`}>
                                      <td style={{ paddingLeft: '20px' }}>
                                        Mean
                                      </td>
                                      <td>{variable.mean.true}</td>
                                      <td>{variable.mean.total}</td>
                                    </tr>
                                  )}
                              </>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </ErrorBoundary>
            )}
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
    </div>
  );
}

export default memo(ExplorerTableOne);
