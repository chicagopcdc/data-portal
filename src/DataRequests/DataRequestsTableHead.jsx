import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { defaultTheme, Flex, Form, Provider } from '@adobe/react-spectrum';
import dictIcons from '../img/icons/index';
import IconComponent from '../components/Icon';
import DateRangePicker from '../components/DateRangePicker';
import SimpleInputField from '../components/SimpleInputField';
import MultiSelect from '../components/MultiSelect';
import '../components/tables/base/Table.css';

function formatResearcher(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return user.institution
    ? `${name} (${user.institution})`
    : name || user.username;
}

function DataRequestsTableHead({
  cols,
  filters,
  onFiltersChange,
  projectStates,
  projectConsortiums,
  adminUsers,
  isAdminActive,
}) {
  const [nameFilter, setNameFilter] = useState(filters.name);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    setNameFilter(filters.name);
  }, [filters.name]);

  useEffect(() => {
    if (nameFilter === filtersRef.current.name) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onFiltersChange({
        ...filtersRef.current,
        name: nameFilter,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [nameFilter, onFiltersChange]);

  const statusItems = Object.keys(projectStates).map((status) => ({
    id: status,
    text: status,
  }));

  const consortiumItems = projectConsortiums.map((consortium) => ({
    id: consortium.code,
    text: consortium.name || consortium.code,
  }));

  const researcherOptions = adminUsers.map((user) => ({
    label: formatResearcher(user),
    value: user.id,
  }));

  function updateFilters(changes) {
    onFiltersChange({
      ...filters,
      ...changes,
    });
  }

  return (
    <thead className='base-table__head'>
      <tr>
        {cols.map((col) => (
          <th className='base-table__column-head' key={col}>
            {col === 'ID' || (col === 'Researcher' && !isAdminActive) ? (
              col
            ) : (
              <>
                <IconComponent
                  dictIcons={dictIcons}
                  iconName='filter'
                  height='12px'
                />{' '}
                {col}
              </>
            )}
          </th>
        ))}
      </tr>

      <tr>
        <th className='base-table__column-head'>
          <SimpleInputField
            className='base-table__filter-field'
            hideLabel
            label='Filter ID'
            input={
              <input
                min='1'
                name='id-filter-input'
                onChange={(event) => updateFilters({ id: event.target.value })}
                type='number'
                value={filters.id}
              />
            }
          />
        </th>

        <th className='base-table__column-head'>
          <SimpleInputField
            className='base-table__filter-field'
            hideLabel
            label='Filter Research Title'
            input={
              <input
                name='research-title-filter-input'
                onChange={(event) => setNameFilter(event.target.value)}
                type='text'
                value={nameFilter}
              />
            }
          />
        </th>

        <th className='base-table__column-head'>
          <SimpleInputField
            className='base-table__filter-field'
            hideLabel
            label='Filter Description'
            input={
              <input
                name='description-filter-input'
                onChange={(event) =>
                  updateFilters({ description: event.target.value })
                }
                type='text'
                value={filters.description}
              />
            }
          />
        </th>

        <th className='base-table__column-head'>
          {isAdminActive && (
            <Select
              classNamePrefix='data-requests-select'
              isClearable
              isMulti
              isSearchable
              menuPortalTarget={document.body}
              onChange={(selected) =>
                updateFilters({
                  researcherIds: (selected || []).map((option) => option.value),
                })
              }
              options={researcherOptions}
              placeholder='Select...'
              value={researcherOptions.filter((option) =>
                filters.researcherIds.includes(option.value),
              )}
            />
          )}
        </th>

        <th className='base-table__column-head'>
          <Provider theme={defaultTheme}>
            <Form validationBehavior='native'>
              <Flex alignItems='center' direction='row' gap={8} margin={0}>
                <DateRangePicker
                  onChange={(range) =>
                    updateFilters({
                      submittedAtStart: range?.start?.toString() || '',
                      submittedAtEnd: range?.end?.toString() || '',
                    })
                  }
                />
              </Flex>
            </Form>
          </Provider>
        </th>

        <th className='base-table__column-head'>
          <Provider theme={defaultTheme}>
            <Form validationBehavior='native'>
              <Flex alignItems='center' direction='row' gap={8} margin={0}>
                <MultiSelect
                  items={statusItems}
                  onChange={(options) =>
                    updateFilters({
                      statuses: options.map((option) => option.id),
                    })
                  }
                />
              </Flex>
            </Form>
          </Provider>
        </th>

        <th className='base-table__column-head'>
          <Provider theme={defaultTheme}>
            <Form validationBehavior='native'>
              <Flex alignItems='center' direction='row' gap={8} margin={0}>
                <MultiSelect
                  items={consortiumItems}
                  onChange={(options) =>
                    updateFilters({
                      consortiums: options.map((option) => option.id),
                    })
                  }
                />
              </Flex>
            </Form>
          </Provider>
        </th>
      </tr>
    </thead>
  );
}

DataRequestsTableHead.propTypes = {
  cols: PropTypes.arrayOf(PropTypes.string).isRequired,
  filters: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    researcherIds: PropTypes.arrayOf(PropTypes.number).isRequired,
    statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
    consortiums: PropTypes.arrayOf(PropTypes.string).isRequired,
    submittedAtStart: PropTypes.string.isRequired,
    submittedAtEnd: PropTypes.string.isRequired,
  }).isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  projectStates: PropTypes.object.isRequired,
  projectConsortiums: PropTypes.array.isRequired,
  adminUsers: PropTypes.array.isRequired,
  isAdminActive: PropTypes.bool,
};

DataRequestsTableHead.defaultProps = {
  isAdminActive: false,
};

export default DataRequestsTableHead;
