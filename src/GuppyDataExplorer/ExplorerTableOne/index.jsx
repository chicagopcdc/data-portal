/* eslint-disable no-shadow */
import { memo, useState, useEffect } from 'react';
import '../ExplorerSurvivalAnalysis/ExplorerSurvivalAnalysis.css';
import Spinner from '../../components/Spinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { contactEmail } from '../../localconf';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  updateTableOneResult,
  buildTableOneOptions,
} from '../../redux/explorer/asyncThunks';
import CovarForm from './CovarForm';
import { useUserAgreement } from './useUserAgreement';
import UserAgreementGate from './UserAgreementGate';
import TableOneResultTable from './TableOneResultTable';
/** @typedef {import('./types').UserInputSubmitHandler} UserInputSubmitHandler */

function ExplorerTableOne() {
  const dispatch = useAppDispatch();
  const result = useAppSelector((state) => state.explorer.tableOneResult);

  const rebuild = useAppSelector(
    (state) => state.explorer.config.tableOneConfig.buildOptions,
  );

  useEffect(() => {
    if (rebuild) {
      dispatch(buildTableOneOptions());
    }
  }, [rebuild]);

  const options = useAppSelector(
    (state) => state.explorer.config.tableOneConfig.options,
  );

  const { isCompliant, agree } = useUserAgreement();
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
        <p>{error?.message}</p>
        <p>
          Please retry by clicking {'"Apply"'} button or refreshing the page. If
          the problem persists, please contact the administrator (
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) for more
          information.
        </p>
      </div>
    );
  }

  return (
    <div className='table-one'>
      <UserAgreementGate isCompliant={isCompliant} onAgree={agree}>
        <div className='table-one__column-left'>
          <CovarForm onSubmit={handleSubmit} options={options} />
        </div>
        <div className='table-one__column-right'>
          {result.isPending ? (
            <Spinner />
          ) : (
            <ErrorBoundary fallback={errorMessage()}>
              {result.error ? (
                errorMessage(result.error)
              ) : (
                <TableOneResultTable
                  submittedName={submittedFilterSetName}
                  result={result.data}
                />
              )}
            </ErrorBoundary>
          )}
        </div>
      </UserAgreementGate>
    </div>
  );
}

export default memo(ExplorerTableOne);
