import { Fragment } from 'react';
import './TableOneResultTable.css';

/** Lock icon matching the exploration-page filter sidebar style. */
function LockedCell() {
  return (
    <i
      className='g3-icon g3-icon--md g3-icon--lock g3-icon-color__gray table-one__locked-cell'
      title='Value suppressed: cell size below minimum threshold'
    />
  );
}

/**
 * Renders a "percent (count)" cell.
 * - count === -1  →  lock icon (small-cell suppressed)
 * - count === 0   →  "(-)"
 * - otherwise     →  "<percent> (<count>)"
 */
function CountCell({ count, percent }) {
  if (count === -1) return <LockedCell />;
  if (count === 0) return '(-)';
  return `${percent} (${count})`;
}

/**
 * Renders a plain numeric count cell.
 * - count === -1  →  lock icon (small-cell suppressed)
 * - otherwise     →  the count value
 */
function PlainCountCell({ count }) {
  if (count === -1) return <LockedCell />;
  return count;
}

export default function TableOneResultTable({ submittedName, result }) {
  if (!result?.variables) return null;

  /**
   * The "Everything Else" denominator for a variable row is the total minus
   * the missing count. If either value is suppressed (-1) we show a lock
   * instead of an arithmetic result that would be meaningless.
   */
  function everythingElseDenominator(variable) {
    if (result.everythingElseCount === -1 || variable.missingFromEverythingElseCount === -1) {
      return <LockedCell />;
    }
    return result.everythingElseCount - variable.missingFromEverythingElseCount;
  }

  return (
    <table className='table-one__table'>
      <thead>
        <tr>
          <th>Covariates</th>
          <th>{submittedName || 'Subset'}</th>
          <th>Everything Else</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Total Subjects in Cohort</strong>
          </td>
          <td>
            <PlainCountCell count={result.trueCount} />
          </td>
          <td>
            <PlainCountCell count={result.everythingElseCount} />
          </td>
        </tr>
        {result.variables.map((variable) => (
          <Fragment key={variable.name}>
            <tr className='covariante-name'>
              <td>
                <strong>{variable.name}</strong>
              </td>
              <td>
                <PlainCountCell count={result.trueCount} />
              </td>
              <td>{everythingElseDenominator(variable)}</td>
            </tr>
            <tr>
              <td className='table-one__indent'>
                <strong>Missing</strong>
              </td>
              <td>
                <CountCell
                  count={variable.missingFromTrueCount}
                  percent={variable.missingFromTruePercent}
                />
              </td>
              <td>
                <CountCell
                  count={variable.missingFromEverythingElseCount}
                  percent={variable.missingFromEverythingElsePercent}
                />
              </td>
            </tr>
            {variable.type === 'categorical' &&
              variable.keys?.map((k) => (
                <tr key={`${variable.name}-${k.name}`}>
                  <td className='table-one__indent'>{k.name}</td>
                  <td>
                    <CountCell count={k.data.trueCount} percent={k.data.truePercent} />
                  </td>
                  <td>
                    <CountCell
                      count={k.data.everythingElseCount}
                      percent={k.data.everythingElsePercent}
                    />
                  </td>
                </tr>
              ))}
            {variable.type === 'continuous' && variable.mean && (
              <tr key={`${variable.name}-mean`}>
                <td className='table-one__indent'>Mean</td>
                <td>
                  {result.trueCount !== 0 && result.trueCount !== -1
                    ? variable.mean.trueMean
                    : null}
                </td>
                <td>
                  {result.everythingElseCount !== 0 && result.everythingElseCount !== -1
                    ? variable.mean.everythingElseMean
                    : null}
                </td>
              </tr>
            )}
            {variable.type === 'continuous' &&
              variable.buckets?.map((bucket) => (
                <tr key={`${variable.name}-${bucket.name}`}>
                  <td className='table-one__indent'>{bucket.name}</td>
                  <td>
                    <CountCell count={bucket.data.trueCount} percent={bucket.data.trueMean} />
                  </td>
                  <td>
                    <CountCell
                      count={bucket.data.everythingElseCount}
                      percent={bucket.data.everythingElseMean}
                    />
                  </td>
                </tr>
              ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
