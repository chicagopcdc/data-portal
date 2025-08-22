function DependentFilterMessage({ dependentFilters }) {
  const multipleDependencies = dependentFilters.length >= 2;
  if (multipleDependencies) {
    return (
      <p className='requirement-message'>
        This filter is associated with other filters. Please be sure to select
        its dependent filters:
        <ul>
          {dependentFilters.map((filterName) => (
            <li> {filterName} </li>
          ))}
        </ul>
      </p>
    );
  }
  return (
    <p className='requirement-message'>
      This filter is associated with another filter. Please be sure to select{' '}
      {dependentFilters}.
    </p>
  );
}

export default DependentFilterMessage;
