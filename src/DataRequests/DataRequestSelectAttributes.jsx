import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../gen3-ui-component/components/Button';
import {
  addProjectDatapoints,
  deleteProjectDatapoints,
  getProjectDatapoints,
  fetchRequestConfigTemplates,
  updateProjectDatapoints,
} from '../redux/dataRequest/asyncThunks';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import './DataRequestSelectAttributes.css';

const normalizeAttributes = (attributes = []) =>
  [...new Set(attributes)].sort((a, b) => a.localeCompare(b));

const getNestedDictionaryAttributes = (
  property,
  prefix,
  visitedSchemas = new Set(),
) => {
  if (!property || visitedSchemas.has(property)) {
    return [];
  }

  const currentPathSchemas = new Set(visitedSchemas);
  currentPathSchemas.add(property);

  const schemas = [property, ...(property?.anyOf || [])].flatMap((schema) =>
    [schema, schema?.items].filter(Boolean),
  );

  return schemas.flatMap((schema) =>
    Object.entries(schema.properties || {}).flatMap(
      ([attributeName, attribute]) => {
        const fullName = `${prefix}.${attributeName}`;
        return [
          fullName,
          ...getNestedDictionaryAttributes(
            attribute,
            fullName,
            currentPathSchemas,
          ),
        ];
      },
    ),
  );
};

export const getDictionaryAttributes = (properties = {}) =>
  normalizeAttributes(
    Object.entries(properties).flatMap(([attributeName, attribute]) => [
      attributeName,
      ...getNestedDictionaryAttributes(attribute, attributeName),
    ]),
  );

export const validateSelectionsAgainstTables = (
  selections = {},
  tables = [],
) => {
  const attributesByTable = tables.reduce((result, table) => {
    result[table.id] = new Set(table.attributes);
    return result;
  }, {});
  const validSelections = {};
  const skippedTables = [];
  const skippedAttributes = [];

  Object.entries(selections || {}).forEach(([tableName, attributes]) => {
    if (!attributesByTable[tableName]) {
      skippedTables.push(tableName);
      return;
    }

    if (!Array.isArray(attributes)) return;

    const validAttributes = attributes.filter((attribute) => {
      const isValid = attributesByTable[tableName].has(attribute);

      if (!isValid) skippedAttributes.push(`${tableName}.${attribute}`);
      return isValid;
    });

    if (validAttributes.length > 0) {
      validSelections[tableName] = normalizeAttributes(validAttributes);
    }
  });

  return {
    validSelections,
    skippedTables: normalizeAttributes(skippedTables),
    skippedAttributes: normalizeAttributes(skippedAttributes),
  };
};

const getSkippedSelectionsMessage = ({ skippedTables, skippedAttributes }) => {
  const messages = [];

  if (skippedTables.length > 0) {
    messages.push(`unavailable tables: ${skippedTables.join(', ')}`);
  }

  if (skippedAttributes.length > 0) {
    messages.push(`unavailable attributes: ${skippedAttributes.join(', ')}`);
  }

  return messages.length > 0
    ? `Skipped ${messages.join('; ')} because they are not in this project's current data dictionary.`
    : '';
};

const selectionsEqual = (first = {}, second = {}) => {
  const tableNames = new Set([...Object.keys(first), ...Object.keys(second)]);

  return [...tableNames].every((tableName) => {
    const firstValues = normalizeAttributes(first[tableName] || []);
    const secondValues = normalizeAttributes(second[tableName] || []);

    return (
      firstValues.length === secondValues.length &&
      firstValues.every((value, index) => value === secondValues[index])
    );
  });
};

const buildSavedDatapointsByTable = (datapoints = []) =>
  datapoints
    .filter(
      (datapoint) =>
        datapoint.type === 'w' &&
        datapoint.term &&
        Array.isArray(datapoint.value_list),
    )
    .reduce((result, datapoint) => {
      result[datapoint.term] = {
        id: datapoint.id,
        value_list: normalizeAttributes(datapoint.value_list),
      };
      return result;
    }, {});

const getSelectionsFromSavedDatapoints = (savedDatapoints) =>
  Object.entries(savedDatapoints).reduce((result, [tableName, datapoint]) => {
    if (datapoint.value_list.length > 0) {
      result[tableName] = datapoint.value_list;
    }
    return result;
  }, {});

export const validateSavedDatapointsAgainstTables = (savedDatapoints, tables) =>
  validateSelectionsAgainstTables(
    getSelectionsFromSavedDatapoints(savedDatapoints),
    tables,
  );

const areAllAttributesChecked = (attributes = [], checkedAttributes = []) =>
  attributes.length > 0 &&
  attributes.every((attribute) => checkedAttributes.includes(attribute));

export const toggleAllAttributes = (
  attributesByTable,
  tableName,
  attributes,
) => {
  const checkedAttributes = attributesByTable[tableName] || [];

  if (areAllAttributesChecked(attributes, checkedAttributes)) {
    const nextAttributesByTable = { ...attributesByTable };
    delete nextAttributesByTable[tableName];
    return nextAttributesByTable;
  }

  return {
    ...attributesByTable,
    [tableName]: attributes,
  };
};

const toggleAttribute = (attributesByTable, tableName, attributeName) => {
  const currentAttributes = attributesByTable[tableName] || [];
  const isSelected = currentAttributes.includes(attributeName);
  const nextAttributes = isSelected
    ? currentAttributes.filter((attribute) => attribute !== attributeName)
    : normalizeAttributes([...currentAttributes, attributeName]);

  if (nextAttributes.length === 0) {
    const remainingTables = { ...attributesByTable };
    delete remainingTables[tableName];
    return remainingTables;
  }

  return {
    ...attributesByTable,
    [tableName]: nextAttributes,
  };
};

/**
 * @param {Object} props
 * @param {number} props.projectId
 * @param {(actionType: string) => void} [props.onAction]
 */
export default function DataRequestSelectAttributes({ projectId, onAction }) {
  const dispatch = useAppDispatch();
  const dictionary = useAppSelector((state) => state.submission.dictionary);
  const {
    requestConfigTemplates: templates,
    isRequestConfigTemplatesPending: isLoadingTemplates,
    requestConfigTemplatesError: templateError,
  } = useAppSelector((state) => state.dataRequest);

  const [savedDatapointsByTable, setSavedDatapointsByTable] = useState({});
  const [selectedAttributesByTable, setSelectedAttributesByTable] = useState(
    {},
  );
  const [availableCheckedByTable, setAvailableCheckedByTable] = useState({});
  const [selectedCheckedByTable, setSelectedCheckedByTable] = useState({});
  const [expandedTables, setExpandedTables] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [requestError, setRequestError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [templateWarning, setTemplateWarning] = useState('');

  const tables = useMemo(
    () =>
      Object.values(dictionary || {})
        .filter(
          (node) =>
            node?.id &&
            node.properties &&
            Object.keys(node.properties).length > 0,
        )
        .map((node) => ({
          id: node.id,
          title: node.title || node.id,
          attributes: getDictionaryAttributes(node.properties),
        }))
        .sort((first, second) => first.title.localeCompare(second.title)),
    [dictionary],
  );
  const isDictionaryLoaded = dictionary !== undefined && dictionary !== null;

  const tableTitlesById = useMemo(
    () =>
      tables.reduce((result, table) => {
        result[table.id] = table.title;
        return result;
      }, {}),
    [tables],
  );

  const loadProjectDatapoints = useCallback(async () => {
    setIsLoading(true);
    setRequestError('');

    const action = await dispatch(getProjectDatapoints(projectId));

    if (action.meta.requestStatus === 'rejected' || action.payload?.isError) {
      setSavedDatapointsByTable({});
      setSelectedAttributesByTable({});
      setRequestError(
        action.payload?.message ||
          'Unable to load selected attributes for this project.',
      );
      setIsLoading(false);
      return false;
    }

    const savedDatapoints = buildSavedDatapointsByTable(
      action.payload?.data || [],
    );
    const validationResult = validateSavedDatapointsAgainstTables(
      savedDatapoints,
      tables,
    );
    const validSelections = validationResult.validSelections;

    setSavedDatapointsByTable(savedDatapoints);
    setSelectedAttributesByTable(validSelections);
    setTemplateWarning(getSkippedSelectionsMessage(validationResult));
    setExpandedTables(
      Object.keys(validSelections).reduce(
        (expanded, tableName) => ({
          ...expanded,
          [`selected-${tableName}`]: true,
        }),
        {},
      ),
    );
    setAvailableCheckedByTable({});
    setSelectedCheckedByTable({});
    setIsLoading(false);
    return true;
  }, [dispatch, projectId, tables]);

  useEffect(() => {
    if (isDictionaryLoaded) loadProjectDatapoints();
  }, [isDictionaryLoaded, loadProjectDatapoints]);

  useEffect(() => {
    dispatch(fetchRequestConfigTemplates());
  }, [dispatch]);

  const toggleTable = (tableName) => {
    setExpandedTables((current) => ({
      ...current,
      [tableName]: !current[tableName],
    }));
  };

  const toggleAllAvailableAttributes = (table) => {
    const selectedAttributes = selectedAttributesByTable[table.id] || [];
    const availableAttributes = table.attributes.filter(
      (attribute) => !selectedAttributes.includes(attribute),
    );

    setAvailableCheckedByTable((current) =>
      toggleAllAttributes(current, table.id, availableAttributes),
    );
  };

  const toggleAllSelectedAttributes = (tableName, attributes) => {
    setSelectedCheckedByTable((current) =>
      toggleAllAttributes(current, tableName, attributes),
    );
  };

  const moveAvailableAttributes = () => {
    setSelectedAttributesByTable((currentSelections) => {
      const nextSelections = { ...currentSelections };

      Object.entries(availableCheckedByTable).forEach(
        ([tableName, attributes]) => {
          nextSelections[tableName] = normalizeAttributes([
            ...(nextSelections[tableName] || []),
            ...attributes,
          ]);
        },
      );

      return nextSelections;
    });

    setAvailableCheckedByTable({});
    setRequestError('');
    setSuccessMessage('');
  };

  const removeSelectedAttributes = () => {
    setSelectedAttributesByTable((currentSelections) => {
      const nextSelections = { ...currentSelections };

      Object.entries(selectedCheckedByTable).forEach(
        ([tableName, attributes]) => {
          const remainingAttributes = (nextSelections[tableName] || []).filter(
            (attribute) => !attributes.includes(attribute),
          );

          if (remainingAttributes.length === 0) {
            delete nextSelections[tableName];
          } else {
            nextSelections[tableName] = remainingAttributes;
          }
        },
      );

      return nextSelections;
    });

    setSelectedCheckedByTable({});
    setRequestError('');
    setSuccessMessage('');
  };

  const loadSelectedTemplate = () => {
    const template = templates.find(({ id }) => id === selectedTemplateId);

    if (!template) return;

    const validationResult = validateSelectionsAgainstTables(
      template.white_list,
      tables,
    );
    const templateSelections = validationResult.validSelections;

    setSelectedAttributesByTable(templateSelections);
    setExpandedTables(
      Object.keys(templateSelections).reduce(
        (expanded, tableName) => ({
          ...expanded,
          [`selected-${tableName}`]: true,
        }),
        {},
      ),
    );
    setAvailableCheckedByTable({});
    setSelectedCheckedByTable({});
    setRequestError('');
    setTemplateWarning(getSkippedSelectionsMessage(validationResult));
    setSuccessMessage(
      `${template.name} template loaded. Review the attributes and save to apply them to this request.`,
    );
  };

  const hasAvailableCheckedAttributes = Object.values(
    availableCheckedByTable,
  ).some((attributes) => attributes.length > 0);

  const hasSelectedCheckedAttributes = Object.values(
    selectedCheckedByTable,
  ).some((attributes) => attributes.length > 0);

  const hasChanges = !selectionsEqual(
    getSelectionsFromSavedDatapoints(savedDatapointsByTable),
    selectedAttributesByTable,
  );

  const saveAttributes = async () => {
    setIsSaving(true);
    setRequestError('');
    setSuccessMessage('');

    const validationResult = validateSelectionsAgainstTables(
      selectedAttributesByTable,
      tables,
    );
    const validSelections = validationResult.validSelections;
    const validationWarning = getSkippedSelectionsMessage(validationResult);

    setSelectedAttributesByTable(validSelections);
    setTemplateWarning(validationWarning);

    const tableNames = new Set([
      ...Object.keys(savedDatapointsByTable),
      ...Object.keys(validSelections),
    ]);

    const requests = [];

    tableNames.forEach((tableName) => {
      const savedDatapoint = savedDatapointsByTable[tableName];
      const selectedAttributes = normalizeAttributes(
        validSelections[tableName] || [],
      );

      if (!savedDatapoint && selectedAttributes.length > 0) {
        requests.push({
          tableName,
          request: dispatch(
            addProjectDatapoints({
              term: tableName,
              value_list: selectedAttributes,
              type: 'w',
              project_id: projectId,
            }),
          ),
        });
        return;
      }

      if (savedDatapoint && selectedAttributes.length === 0) {
        requests.push({
          tableName,
          request: dispatch(
            deleteProjectDatapoints({
              id: savedDatapoint.id,
            }),
          ),
        });
        return;
      }

      if (
        savedDatapoint &&
        !selectionsEqual(
          { [tableName]: savedDatapoint.value_list },
          { [tableName]: selectedAttributes },
        )
      ) {
        requests.push({
          tableName,
          request: dispatch(
            updateProjectDatapoints({
              id: savedDatapoint.id,
              term: tableName,
              value_list: selectedAttributes,
              type: 'w',
              project_id: projectId,
            }),
          ),
        });
      }
    });

    const results = await Promise.all(
      requests.map(async ({ tableName, request }) => ({
        tableName,
        action: await request,
      })),
    );

    const failedResults = results.filter(
      ({ action }) =>
        action.meta.requestStatus === 'rejected' || action.payload?.isError,
    );

    const didRefresh = await loadProjectDatapoints();
    setIsSaving(false);

    if (failedResults.length > 0) {
      const failedTableNames = failedResults
        .map(({ tableName }) => tableTitlesById[tableName] || tableName)
        .join(', ');
      const refreshMessage = didRefresh
        ? 'The selections have been refreshed from the server.'
        : 'The latest selections could not be refreshed from the server.';

      setRequestError(
        `Unable to save attributes for: ${failedTableNames}. ${refreshMessage}`,
      );
      return;
    }

    if (!didRefresh) {
      setRequestError(
        'Attributes were saved, but the latest selections could not be refreshed from the server.',
      );
      return;
    }

    setSuccessMessage('Project request attributes saved.');
    onAction?.('SELECT_ATTRIBUTES');
  };

  return (
    <div className='data-request-select-attributes'>
      <div className='data-request__header'>
        <h2>Select Attributes</h2>
        <p>Select variables to include in this project request.</p>
      </div>

      {isLoading ? (
        <div className='data-request-select-attributes__loading'>
          Loading attributes...
        </div>
      ) : (
        <>
          <div className='data-request-select-attributes__template-loader'>
            <label htmlFor='request-configuration-template'>
              Start with template
            </label>
            <select
              id='request-configuration-template'
              value={selectedTemplateId}
              disabled={isLoadingTemplates || templates.length === 0}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              <option value=''>
                {isLoadingTemplates
                  ? 'Loading templates...'
                  : 'Choose a template'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <Button
              label='Load Template'
              buttonType='secondary'
              onClick={loadSelectedTemplate}
              enabled={Boolean(selectedTemplateId) && !isLoadingTemplates}
            />
          </div>

          {templateError && (
            <div className='data-request__request-error'>{templateError}</div>
          )}

          {templateWarning && (
            <div
              className='data-request-select-attributes__template-warning'
              role='alert'
            >
              {templateWarning}
            </div>
          )}

          <div className='data-request-select-attributes__columns'>
            <section className='data-request-select-attributes__column'>
              <h3>Available Attributes</h3>

              <div className='data-request-select-attributes__table-list'>
                {tables.map((table) => {
                  const selectedAttributes =
                    selectedAttributesByTable[table.id] || [];
                  const isExpanded = expandedTables[table.id];

                  return (
                    <div
                      className='data-request-select-attributes__table'
                      key={table.id}
                    >
                      <div className='data-request-select-attributes__available-table-header'>
                        <input
                          className='data-request-select-attributes__table-checkbox'
                          type='checkbox'
                          aria-label={`Select all ${table.title} attributes`}
                          checked={areAllAttributesChecked(
                            table.attributes.filter(
                              (attribute) =>
                                !selectedAttributes.includes(attribute),
                            ),
                            availableCheckedByTable[table.id] || [],
                          )}
                          disabled={table.attributes.every((attribute) =>
                            selectedAttributes.includes(attribute),
                          )}
                          onChange={() => toggleAllAvailableAttributes(table)}
                        />
                        <button
                          type='button'
                          className='data-request-select-attributes__table-toggle'
                          onClick={() => toggleTable(table.id)}
                          aria-expanded={isExpanded}
                        >
                          <span>{isExpanded ? '−' : '+'}</span>
                          <span>{table.title}</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className='data-request-select-attributes__attribute-list'>
                          {table.attributes.map((attribute) => {
                            const isAlreadySelected =
                              selectedAttributes.includes(attribute);
                            const isChecked = (
                              availableCheckedByTable[table.id] || []
                            ).includes(attribute);

                            return (
                              <label
                                className='data-request-select-attributes__attribute'
                                key={attribute}
                              >
                                <input
                                  type='checkbox'
                                  checked={isChecked}
                                  disabled={isAlreadySelected}
                                  onChange={() =>
                                    setAvailableCheckedByTable((current) =>
                                      toggleAttribute(
                                        current,
                                        table.id,
                                        attribute,
                                      ),
                                    )
                                  }
                                />
                                <span>{attribute}</span>
                                {isAlreadySelected && (
                                  <span className='data-request-select-attributes__selected-label'>
                                    Selected
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                label='Add selected attributes →'
                buttonType='secondary'
                onClick={moveAvailableAttributes}
                enabled={hasAvailableCheckedAttributes}
              />
            </section>

            <section className='data-request-select-attributes__column'>
              <h3>Selected Attributes</h3>

              <div className='data-request-select-attributes__table-list'>
                {Object.keys(selectedAttributesByTable).length === 0 ? (
                  <p className='data-request-select-attributes__empty-state'>
                    No attributes selected.
                  </p>
                ) : (
                  Object.entries(selectedAttributesByTable)
                    .sort(([first], [second]) =>
                      (tableTitlesById[first] || first).localeCompare(
                        tableTitlesById[second] || second,
                      ),
                    )
                    .map(([tableName, attributes]) => {
                      const isExpanded =
                        expandedTables[`selected-${tableName}`];

                      return (
                        <div
                          className='data-request-select-attributes__table'
                          key={tableName}
                        >
                          <div className='data-request-select-attributes__available-table-header'>
                            <input
                              className='data-request-select-attributes__table-checkbox'
                              type='checkbox'
                              aria-label={`Select all ${tableTitlesById[tableName] || tableName} attributes for removal`}
                              checked={areAllAttributesChecked(
                                attributes,
                                selectedCheckedByTable[tableName] || [],
                              )}
                              onChange={() =>
                                toggleAllSelectedAttributes(
                                  tableName,
                                  attributes,
                                )
                              }
                            />
                            <button
                              type='button'
                              className='data-request-select-attributes__table-toggle'
                              onClick={() =>
                                toggleTable(`selected-${tableName}`)
                              }
                              aria-expanded={isExpanded}
                            >
                              <span>{isExpanded ? '−' : '+'}</span>
                              <span>
                                {tableTitlesById[tableName] || tableName}
                              </span>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className='data-request-select-attributes__attribute-list'>
                              {attributes.map((attribute) => (
                                <label
                                  className='data-request-select-attributes__attribute'
                                  key={attribute}
                                >
                                  <input
                                    type='checkbox'
                                    checked={(
                                      selectedCheckedByTable[tableName] || []
                                    ).includes(attribute)}
                                    onChange={() =>
                                      setSelectedCheckedByTable((current) =>
                                        toggleAttribute(
                                          current,
                                          tableName,
                                          attribute,
                                        ),
                                      )
                                    }
                                  />
                                  <span>{attribute}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              <Button
                label='← Remove selected attributes'
                buttonType='secondary'
                onClick={removeSelectedAttributes}
                enabled={hasSelectedCheckedAttributes}
              />
            </section>
          </div>

          <div className='data-request-select-attributes__footer'>
            <Button
              label='Save Attributes'
              onClick={saveAttributes}
              enabled={hasChanges && !isSaving}
              isPending={isSaving}
            />
          </div>
        </>
      )}

      {requestError && (
        <div className='data-request__request-error'>{requestError}</div>
      )}

      {successMessage && (
        <div className='submission-success-message'>{successMessage}</div>
      )}
    </div>
  );
}
