import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap_white.css';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '../../gen3-ui-component/components/Button';
import SimpleInputField from '../../components/SimpleInputField';
import { useAppSelector } from '../../redux/hooks';
import { overrideSelectTheme } from '../../utils';
import { defaultFilterSet } from '../ExplorerSurvivalAnalysis/ControlForm';
import FilterSetCard from './FilterSetCard';
import CovarCard from './CovarCard';
import option from '../../../data/config/tableOneHelper.json'
import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import "./index.css"
//import { getGQLFilter } from '@src/GuppyComponents/Utils/queries';


const emptyFilterSetIds = [];
var requestbody = {
  filterSets :[],
  usedFilterSetIds :[],
  covarFields :["_subject_id"],
  covariates:[]
}

const response = {
  variables: [
    {
      keys: [
        {
          data: {
            true: "19.8%",
          },
          name: "Alive",
        },
        {
          data: {
            true: "33.0%",
          },
          name: "Dead",
        },
        {
          data: {
            true: "17.6%",
          },
          name: "Unknown",
        },
      ],
      name: "lkss",
      size: {
        total: 363,
        true: 91,
      },
    },
  ],
};



function CovarForm() {
  const variable = response.variables[0];
  const[ selectableVaris, setSelectableVaris] = useState(option)
  const[isReplied, setIsReplied] = useState(null)   
  const filterConfig= useAppSelector((state) => state.explorer.config.filterConfig);
  const savedFilterSets = useAppSelector(
    (state) => state.explorer.savedFilterSets.data
  );

  console.log(savedFilterSets)

  const [selectFilterSet, setSelectFilterSet] = useState(null);
  const [usedFilterSetIds, setUsedFilterSetIds] = useState(emptyFilterSetIds);
  const [covarList, setCovarList] = useState([]);
  const [numnum, setnum] = useState(0);
  const [disableOption, setDisableOption] = useState([]);

  const [variList, setVariList] = useState([])

  const emptyCovar = {label:'',
                      name:0,
                      type:''}
  
  const filterSetOptions = [];
  const usedFilterSets = [];
  for(const filterSet of [defaultFilterSet, ...savedFilterSets]){
    const { name: label, id: value } = filterSet;
    const isUsed = usedFilterSetIds.includes(value);
    const isDisabled = isUsed || false;
    filterSetOptions.push({
      label: isUsed ? (
        <Tooltip
          arrowContent={<div className='rc-tooltip-arrow-inner' />}
          mouseLeaveDelay={0}
          overlay='This Filter Set is already in use.'
          placement='right'
        >
          <span>{label}</span>
        </Tooltip>
      ) : (
        label
      ),
      value,
      isDisabled,
    });

    if (isUsed) {
      usedFilterSets.push({ ...filterSet });
    }
  }

  const addCovar = ()=>{
    var obj = emptyCovar;
    obj.name = numnum;
    requestbody.covarFields.push("")
    requestbody.covariates.push({})
    setnum(numnum+1)
    setCovarList([...covarList,obj]);
  }

  const handleSubmit = ()=>{
    const filterSets = [];

    for (const [index, filterSet] of usedFilterSets.entries()) {
    const { filter, id, isStale, name: _name } = filterSet;
    const name = `${index + 1}. ${_name}`;
    
    //check cache here!!

    // const shouldUseCache = id in result && !isStale && !args.shouldRefetch;
    // if (shouldUseCache) cache[id] = { ...result[id], name }; 

    filterSets.push({ filters: getGQLFilter(filter) ?? {}, id, name });
    }
    requestbody.filterSets = savedFilterSets;
    requestbody.usedFilterSetIds = usedFilterSetIds;

    requestbody.filterSets = filterSets
    console.log(requestbody)

   
    setIsReplied(requestbody)
  }

  const updateBody = (input, type, i)=>{
    if(type == "value"){
      requestbody.covariates[i].values = [...input]
    }
    else if(type == "key"){
      requestbody.covariates[i].keys = [...input]
    }
    else if(type == "variable"){
      requestbody.covarFields[i+1] = input.label;
      requestbody.covariates[i] = {
        type: input.type,
        name: input.name,
        label:input.label,
        values: [],
        keys: []
      }
    }

    console.log(requestbody)
  }
  return(
    <div className='explorer-table-one__covar-form'>
      <div className = 'exploerer-table-one__filter-group-variable'>
        <div className='explorer-survival-analysis__filter-set-select'>
          <Select
            inputId='survival-filter-sets'
            placeholder='Select Filter Set to analyze'
            options={filterSetOptions}
            onChange={setSelectFilterSet}
            maxMenuHeight={160}
            value={selectFilterSet}
            theme={overrideSelectTheme}
            menuPlacement='auto'
          />
          <Button
            label='Add'
            buttonType='default'
            enabled={selectFilterSet !== null}
            onClick={() => {
              console.log(usedFilterSetIds);
              setUsedFilterSetIds((ids) => [...ids, selectFilterSet.value]);
              setSelectFilterSet(null);
            }}
          />
        </div>
        {usedFilterSets.length === 0 ? (
          <span style={{ fontStyle: 'italic' }}>
            Nothing to show here. Try select and use Filter Sets for survival
            analysis.
          </span>
        ) : (
          usedFilterSets.map((filterSet, i) => (
            <FilterSetCard
              key={filterSet.id}
              filterSet={filterSet}
              label={`${i + 1}. ${filterSet.name}`}
              onClose={() => {
                setUsedFilterSetIds((ids) =>
                  ids.filter((id) => id !== filterSet.id)
                );
              }}
            />
          ))
        )}
      </div>

      {covarList.map((e, index) => {
        return(
          <CovarCard
            count = {index}
            variate = {e}
            covarList = {covarList}
            setCovarList = {setCovarList}
            selectableVaris = {selectableVaris}
            setSelectableVaris = {setSelectableVaris}
            updateBody = {updateBody}
            variList = {variList}
            setVariList = {setVariList}
          />
        )

      })}
        
        <div className='explorer-survival-analysis__button-group'>
        <Button label='Add Variable' buttonType='default' onClick={addCovar}/>
        </div>
        
        <div className='explorer-survival-analysis__button-group'>
        <Button label='Reset' buttonType='default'/>
        <Button
          label='Apply'
          buttonType='primary'
          onClick={handleSubmit}
        />
      </div>
      {isReplied == null? null : <div className="table-container">
      <h2>Table One for {variable.name}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>True</th>
            <th>False</th>
          </tr>
        </thead>
        <tbody>
          {variable.keys.map((key, index) => {
            const trueValue = parseFloat(key.data.true.replace("%", "")) / 100;
            const falseValue = (1 - trueValue) * 100;
            return (
              <tr key={index}>
                <td>{key.name}</td>
                <td>{key.data.true}</td>
                <td>{falseValue.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="summary">
        <p>Total: {variable.size.total}</p>
        <p>True Count: {variable.size.true}</p>
        <p>False Count: {variable.size.total - variable.size.true}</p>
      </div>
    </div>}
      </div>)
}
export default CovarForm