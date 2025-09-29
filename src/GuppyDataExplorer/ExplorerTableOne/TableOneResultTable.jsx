import { Fragment } from 'react';


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
          <td><strong>Total Subjects in Cohort</strong></td>
          <td>{result.trueCount}</td>
          <td>{result.totalCount}</td>
        </tr>
        {result.variables.map((variable) => (
          <Fragment key={variable.name}>
            <tr className="covariante-name">
              <td><strong>{variable.name}</strong></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td className='table-one__indent'><strong>Missing</strong></td>
              <td>{variable.missingFromTrue} ({variable.missingFromTrueCount})</td>
              <td>{variable.missingFromTotal} ({variable.missingFromTotalCount})</td>
            </tr>
            {variable.type === 'categorical' &&
              variable.keys?.map((k) => (
                <tr key={`${variable.name}-${k.name}`}>
                  <td className='table-one__indent'>{k.name}</td>
                  <td>{k.data.true} ({k.data.trueCount})</td>
                  <td>{k.data.total} ({k.data.totalCount})</td>
                </tr>
              ))}
            {variable.type === 'continuous' && variable.mean && (
              <tr key={`${variable.name}-mean`}>
                <td className='table-one__indent'>Mean</td>
                <td>{variable.mean.true}</td>
                <td>{variable.mean.total}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}