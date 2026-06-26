import { Fragment } from 'react';
import './TableOneResultTable.css';

export default function TableOneResultTable({ submittedName, result }) {
  if (!result?.variables) return null;
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
          <td>{result.trueCount}</td>
          <td>{result.everythingElseCount}</td>
        </tr>
        {result.variables.map((variable) => (
          <Fragment key={variable.name}>
            <tr className='covariante-name'>
              <td>
                <strong>{variable.name}</strong>
              </td>
              <td>{result.trueCount}</td>
              <td>{result.everythingElseCount - variable.missingFromEverythingElseCount}</td>
            </tr>
            <tr>
              <td className='table-one__indent'>
                <strong>Missing</strong>
              </td>
              <td>
                {variable.missingFromTrueCount !== 0 ? `${variable.missingFromTruePercent} (${variable.missingFromTrueCount})` : '(-)'}
              </td>
              <td>
                {variable.missingFromEverythingElseCount !== 0 ? `${variable.missingFromEverythingElsePercent} (${variable.missingFromEverythingElseCount})` : '(-)'}
              </td>
            </tr>
            {variable.type === 'categorical' &&
              variable.keys?.map((k) => (
                <tr key={`${variable.name}-${k.name}`}>
                  <td className='table-one__indent'>{k.name}</td>
                  <td>
                    {k.data.trueCount !== 0 ? `${k.data.truePercent} (${k.data.trueCount})` : '(-)'}
                  </td>
                  <td>
                    {k.data.everythingElseCount !== 0 ? `${k.data.everythingElsePercent} (${k.data.everythingElseCount})` : '(-)'}
                  </td>
                </tr>
              ))}
            {variable.type === 'continuous' && variable.mean && (
              <tr key={`${variable.name}-mean`}>
                <td className='table-one__indent'>Mean</td>
                <td>{result.trueCount !== 0 ? variable.mean.trueMean : null}</td>
                <td>{result.everythingElseCount !== 0 ? variable.mean.everythingElseMean : null}</td>
              </tr>
            )}
            {variable.type === 'continuous' &&
              variable.buckets?.map((bucket) => (
                <tr key={`${variable.name}-${bucket.name}`}>
                  <td className='table-one__indent'>{bucket.name}</td>
                  <td>
                    {bucket.data.trueCount !== 0 ? `${bucket.data.trueMean} (${bucket.data.trueCount})` : '(-)'}
                  </td>
                  <td>
                    {bucket.data.everythingElseCount !== 0 ? `${bucket.data.everythingElseMean} (${bucket.data.everythingElseCount})` : '(-)'}
                  </td>
                </tr>
              ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
