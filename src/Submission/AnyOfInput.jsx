import PropTypes from 'prop-types';
import TextInput from './TextInput';
import './AnyOfInput.css';

/**
 * @param {Object} props
 * @param {string} props.name
 * @param {Object[]} [props.values]
 * @param {any} props.node
 * @param {(name: string, event: React.ChangeEvent<HTMLInputElement>, properties: string[]) => void} props.onChange
 * @param {string[]} props.properties
 * @param {boolean} props.required
 * @param {string[]} [props.requireds]
 */
function AnyOfInput({
  name,
  values,
  node,
  onChange,
  properties,
  required,
  requireds = [],
}) {
  // this is smelly code because it reuses logic from SubmitNodeForm,
  // I'd like to extract some of the code into another function
  /** @type {React.ChangeEventHandler<HTMLInputElement>} */
  function onChangeAnyOfWrapper(event) {
    onChange(name, event, properties);
  }

  return (
    <div>
      <h6 className='any-of-input__name'>{name}:</h6>
      {required && (
        <span className='any-of-input__required-notification'> {'*'} </span>
      )}
      <div className='any-of-input__sub-props'>
        {properties.map((property) => {
          let description =
            'description' in node.properties[property]
              ? node.properties[property].description
              : '';
          if (description === '') {
            description =
              'term' in node.properties[property]
                ? node.properties[property].term.description
                : '';
          }
          const requiredSubprop = requireds.indexOf(property) > -1;
          // we use index 0 of values because AnyOfInput is hardcoded
          // to be an array of length 1, an upcoming feature should be to add to this array
          return (
            <TextInput
              key={property}
              name={property}
              value={values ? values[0][property] : ''}
              required={required && requiredSubprop}
              description={description}
              onChange={onChangeAnyOfWrapper}
            />
          );
        })}
      </div>
    </div>
  );
}

AnyOfInput.propTypes = {
  name: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.object),
  node: PropTypes.any.isRequired,
  properties: PropTypes.array.isRequired,
  required: PropTypes.bool.isRequired,
  requireds: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};

export default AnyOfInput;
