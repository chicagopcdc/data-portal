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
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td className='table-one__indent'>
                <strong>Missing</strong>
              </td>
              <td>
                {variable.missingFromTruePercent} (
                {variable.missingFromTrueCount})
              </td>
              <td>
                {variable.missingFromEverythingElsePercent} (
                {variable.missingFromEverythingElseCount})
              </td>
            </tr>
            {variable.type === 'categorical' &&
              variable.keys?.map((k) => (
                <tr key={`${variable.name}-${k.name}`}>
                  <td className='table-one__indent'>{k.name}</td>
                  <td>
                    {k.data.truePercent} ({k.data.trueCount})
                  </td>
                  <td>
                    {k.data.everythingElsePercent} ({k.data.everythingElseCount}
                    )
                  </td>
                </tr>
              ))}
            {variable.type === 'continuous' && variable.mean && (
              <tr key={`${variable.name}-mean`}>
                <td className='table-one__indent'>Mean</td>
                <td>{variable.mean.trueMean}</td>
                <td>{variable.mean.everythingElseMean}</td>
              </tr>
            )}
            {variable.type === 'continuous' &&
              variable.buckets?.map((bucket) => (
                <tr key={`${variable.name}-${bucket.name}`}>
                  <td className='table-one__indent'>{bucket.name}</td>
                  <td>
                    {bucket.data.trueMean} ({bucket.data.trueCount})
                  </td>
                  <td>
                    {bucket.data.everythingElseMean} (
                    {bucket.data.everythingElseCount})
                  </td>
                </tr>
              ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
