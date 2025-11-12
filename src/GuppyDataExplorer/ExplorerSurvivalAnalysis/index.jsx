/* eslint-disable no-shadow */
import { memo, useState } from 'react';
import { contactEmail } from '../../localconf';
import ErrorBoundary from '../../components/ErrorBoundary';
import Spinner from '../../components/Spinner';
import { updateSurvivalResult } from '../../redux/explorer/asyncThunks';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import SurvivalPlot from './SurvivalPlot';
import ControlForm from './ControlForm';
import RiskTable from './RiskTable';
import UserAgreement from './UserAgreement';
import { checkUserAgreement, handleUserAgreement } from './utils';
import './ExplorerSurvivalAnalysis.css';
import { DEFAULT_END_YEAR, DEFAULT_INTERVAL } from './const';

/** @typedef {import('./types').UserInputSubmitHandler} UserInputSubmitHandler */

function ExplorerSurvivalAnalysis() {
  const dispatch = useAppDispatch();
  const result = useAppSelector(
    (state) => state.explorer.survivalAnalysisResult,
  );

  const [isUserCompliant, setIsUserCompliant] = useState(checkUserAgreement());
  const [timeInterval, setTimeInterval] = useState(DEFAULT_INTERVAL);
  const [startTime, setStartTime] = useState(0);
  const [efsFlag, setEfsFlag] = useState(false);
  const [endTime, setEndTime] = useState(DEFAULT_END_YEAR);

  // capture non-200 errors locally so ControlForm can show its overlay
  const [requestError, setRequestError] = useState(null);

  /** @type {UserInputSubmitHandler} */
  const handleSubmit = (input) => {
    const shouldRefetch = efsFlag !== input.efsFlag;

    setEfsFlag(input.efsFlag);
    setTimeInterval(input.timeInterval);
    setStartTime(input.startTime);
    setEndTime(input.endTime);

    setRequestError(null); // clear any previous error
    dispatch(
      updateSurvivalResult({
        efsFlag: input.efsFlag,
        shouldRefetch,
        usedFilterSets: input.usedFilterSets,
      }),
    )
      .unwrap()
      .catch((e) => {
        // pass a clean string down to ControlForm
        setRequestError(e?.message ?? String(e));
      });
  };

  function errorMessage(error) {
    return (
      <div className='explorer-survival-analysis__error'>
        <h1>Unable to generate survival curve</h1>
        {error?.message && error.message === 'NOT FOUND' ? (
          <p>
            The Data Portal was unable to generate a survival curve due to
            insufficient data. Please check your filter(s) and try again. You
            may contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a>)
            if you need further assistance.
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

  return (
    <div className='explorer-survival-analysis'>
      {isUserCompliant ? (
        <>
          <div className='explorer-survival-analysis__column-left'>
            <ControlForm
              countByFilterSet={result.parsed.count}
              requestError={result.error}
              onSubmit={handleSubmit}
            />
          </div>
          <div className='explorer-survival-analysis__column-right'>
            {result.isPending ? (
              <Spinner />
            ) : (
              <ErrorBoundary fallback={errorMessage()}>
                {result.error ? (
                  errorMessage(Error(result.error))
                ) : (
                  <>
                    {'survival' in result.parsed && (
                      <SurvivalPlot
                        data={result.parsed.survival}
                        endTime={endTime}
                        efsFlag={efsFlag}
                        startTime={startTime}
                        timeInterval={timeInterval}
                      />
                    )}
                    {'risktable' in result.parsed && (
                      <RiskTable
                        data={result.parsed.risktable}
                        endTime={endTime}
                        startTime={startTime}
                        timeInterval={timeInterval}
                      />
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

export default memo(ExplorerSurvivalAnalysis);
