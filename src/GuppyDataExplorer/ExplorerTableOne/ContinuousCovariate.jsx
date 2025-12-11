import { useState, useEffect } from 'react';
import './ContinuousCovariate.css';
import Button from '../../gen3-ui-component/components/Button';
import { min } from 'd3-array';
export default function ContinuousCovariate({
  position,
  covariate,
  updateCovariates,
}) {
  const [minValue, maxValue] = covariate.values;

  // Track bucket boundaries - start with just min and max
  const [boundaries, setBoundaries] = useState([]);
  const [inclusiveLower, setInclusiveLower] = useState([]);
  const [inputValues, setInputValues] = useState({});

  // Update parent component when boundaries change
  useEffect(() => {
    const updatedCovariate = { ...covariate };

    if (boundaries.length > 0) {
      updatedCovariate.buckets = boundaries.map((boundary, i) => ({
        splitValue: boundary,
        inclusiveLower: inclusiveLower[i],
      }));
    } else {
      delete updatedCovariate.buckets;
    }

    updateCovariates((prev) => {
      const newCovariates = [...prev];
      newCovariates[position] = updatedCovariate;
      return newCovariates;
    });
  }, [boundaries]);

  const addBoundary = () => {
    // Add a new boundary between the last boundary and max value
    const newBoundary =
      boundaries.length >= 1
        ? (boundaries[boundaries.length - 1] + maxValue) / 2
        : (minValue + maxValue) / 2;

    // Insert new boundary before the last one (which is maxValue)
    setBoundaries((prev) => [...prev, newBoundary]);
    setInclusiveLower((prev) => [...prev, true]);
  };

  const removeBoundary = (index) => {
    setBoundaries(boundaries.filter((_, i) => i !== index));
    setInclusiveLower((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBoundary = (index, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newBoundaries = [...boundaries];

    // Constrain the value within bounds and prevent crossing
    let constrainedValue = numValue;

    // Can't go below the previous boundary
    if (index > 0) {
      constrainedValue = Math.max(constrainedValue, boundaries[index - 1]);
    } else {
      constrainedValue = Math.max(constrainedValue, minValue);
    }

    // Can't go above the next boundary
    if (index < boundaries.length - 1) {
      constrainedValue = Math.min(constrainedValue, boundaries[index + 1]);
    } else {
      constrainedValue = Math.min(constrainedValue, maxValue);
    }

    newBoundaries[index] = constrainedValue;
    setBoundaries(newBoundaries);
  };

  const updateInclusiveLower = (index, value) => {
    const newInclusiveLower = [...inclusiveLower];
    newInclusiveLower[index] = value;
    setInclusiveLower(newInclusiveLower);
  };

  return (
    <div className='covar_card_continuous_container'>
      <div
        className={`covar_card_continuous_header ${boundaries.length === 0 ? 'covar_card_continuous_header--no-border' : ''}`}
      >
        <span className='covar_card_continuous_label'>Range Buckets</span>
        <Button label='Add Bucket' buttonType='default' onClick={addBoundary} />
      </div>

      <div className='covar_card_range_section'>
        {boundaries.length > 0 && (
          <div className='covar_card_range_inner'>
            {/* Multi-slider container */}
            <div className='covar_card_multi_slider_container'>
              {/* First segment from minValue to first boundary */}
              <div
                className={`covar_card_bucket_segment covar_card_bucket_segment--0`}
                style={{
                  left: '0%',
                  width: `${((boundaries[0] - minValue) / (maxValue - minValue)) * 100}%`,
                }}
              >
                <span>Bucket 1</span>
              </div>
              {boundaries.map((boundary, index) => {
                if (index === boundaries.length - 1) return null; // Skip last boundary
                return (
                  <div
                    key={index}
                    className={`covar_card_bucket_segment covar_card_bucket_segment--${(index + 1) % 3}`}
                    style={{
                      left: `${((boundary - minValue) / (maxValue - minValue)) * 100}%`,
                      width: `${((boundaries[index + 1] - boundary) / (maxValue - minValue)) * 100}%`,
                    }}
                  >
                    <span>Bucket {index + 2}</span>
                  </div>
                );
              })}
              {/* Last segment from last boundary to maxValue */}
              <div
                className={`covar_card_bucket_segment covar_card_bucket_segment--${boundaries.length % 3}`}
                style={{
                  left: `${((boundaries[boundaries.length - 1] - minValue) / (maxValue - minValue)) * 100}%`,
                  width: `${((maxValue - boundaries[boundaries.length - 1]) / (maxValue - minValue)) * 100}%`,
                }}
              >
                <span>Bucket {boundaries.length + 1}</span>
              </div>
              {/* Min value thumb */}
              <div
                className={`covar_card_boundary_thumb covar_card_boundary_thumb--0`}
                style={{
                  left: '0%',
                }}
              >
                <div className='covar_card_thumb_pointer'></div>
                <div className='covar_card_thumb_value'>
                  {minValue.toFixed(1)}
                </div>
              </div>
              {boundaries.map((boundary, index) => (
                <div
                  key={index}
                  className={`covar_card_boundary_thumb covar_card_boundary_thumb--${(inclusiveLower[index] ? index : index + 1) % 3}`}
                  style={{
                    left: `${((boundary - minValue) / (maxValue - minValue)) * 100}%`,
                  }}
                >
                  <div className='covar_card_thumb_pointer'></div>
                  <div className='covar_card_thumb_value'>
                    {boundary.toFixed(1)}
                  </div>
                </div>
              ))}
              {/* Max value thumb */}
              <div
                className={`covar_card_boundary_thumb covar_card_boundary_thumb--${boundaries.length % 3}`}
                style={{
                  left: '100%',
                }}
              >
                <div className='covar_card_thumb_pointer'></div>
                <div className='covar_card_thumb_value'>
                  {maxValue.toFixed(1)}
                </div>
              </div>
            </div>
            {/* Individual boundary controls */}
            <div className='covar_card_boundary_controls'>
              {boundaries.map((boundary, index) => {
                const items = [];

                items.push(
                  <div
                    key={`bucket-${index}`}
                    className={`covar_card_bucket_item covar_card_bucket_item--${index % 3}`}
                  >
                    <div className='covar_card_bucket_header'>
                      <span className='covar_card_bucket_label'>
                        Bucket {index + 1}
                      </span>
                    </div>
                    <div className='covar_card_bucket_range'>
                      <span className='covar_card_range_value'>
                        {index > 0
                          ? boundaries[index - 1].toFixed(2)
                          : minValue.toFixed(2)}
                      </span>
                      <span className='covar_card_range_separator'>to</span>
                      <span className='covar_card_range_value'>
                        {boundaries[index].toFixed(2)}
                      </span>
                    </div>
                    <div className='covar_card_bucket_info'>
                      <span>
                        {index > 0
                          ? inclusiveLower[index - 1]
                            ? `${boundary.toFixed(2)} < `
                            : `${boundary.toFixed(2)} ≤ `
                          : minValue.toFixed(2) + ' ≤ '}
                        values
                        {inclusiveLower[index]
                          ? ` ≤ ${boundaries[index].toFixed(2)}`
                          : ` < ${boundaries[index].toFixed(2)}`}
                      </span>
                    </div>
                  </div>,
                );

                // Add the boundary control (detailed editing view)
                items.push(
                  <div
                    key={`control-${index}`}
                    className='covar_card_boundary_control'
                  >
                    <div className='covar_card_boundary_control_header'>
                      <div className='covar_card_checkbox_container'>
                        <label
                          htmlFor={`include-boundary-${index}`}
                          className='covar_card_checkbox_label'
                        >
                          Include boundary value in bucket {index + 1}
                        </label>
                        <input
                          type='checkbox'
                          id={`include-boundary-${index}`}
                          checked={inclusiveLower[index]}
                          onChange={(e) =>
                            updateInclusiveLower(index, e.target.checked)
                          }
                          className='covar_card_checkbox'
                        />
                      </div>
                      <button
                        aria-label='Clear'
                        type='button'
                        onClick={() => removeBoundary(index)}
                      >
                        <i className='g3-icon g3-icon--sm g3-icon--cross' />
                      </button>
                    </div>

                    <div className='covar_card_boundary_main_controls'>
                      <div className='covar_card_value_input_section'>
                        <label className='covar_card_input_label'>
                          Split Value:
                        </label>
                        <div className='covar_card_input_with_range'>
                          <span className='covar_card_range_indicator'>
                            {(index === 0
                              ? minValue
                              : boundaries[index - 1]
                            ).toFixed(1)}
                          </span>
                          <input
                            type='number'
                            value={
                              inputValues[index] !== undefined
                                ? inputValues[index]
                                : boundary.toFixed(2)
                            }
                            min={index === 0 ? minValue : boundaries[index - 1]}
                            max={
                              index === boundaries.length - 1
                                ? maxValue
                                : boundaries[index + 1]
                            }
                            step={0.1}
                            onChange={(e) => {
                              setInputValues((prev) => ({
                                ...prev,
                                [index]: e.target.value,
                              }));
                            }}
                            onBlur={(e) => {
                              updateBoundary(index, e.target.value);
                              setInputValues((prev) => {
                                const newValues = { ...prev };
                                delete newValues[index];
                                return newValues;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateBoundary(index, e.target.value);
                                setInputValues((prev) => {
                                  const newValues = { ...prev };
                                  delete newValues[index];
                                  return newValues;
                                });
                                e.target.blur();
                              }
                            }}
                            className='covar_card_boundary_input'
                            placeholder='Enter value'
                          />
                          <span className='covar_card_range_indicator'>
                            {(index === boundaries.length - 1
                              ? maxValue
                              : boundaries[index + 1]
                            ).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className='covar_card_slider_section'>
                        <label className='covar_card_input_label'>
                          Adjust with slider:
                        </label>
                        <div className='covar_card_slider_container'>
                          <input
                            type='range'
                            value={boundary}
                            min={index === 0 ? minValue : boundaries[index - 1]}
                            max={
                              index === boundaries.length - 1
                                ? maxValue
                                : boundaries[index + 1]
                            }
                            step={0.1}
                            onChange={(e) =>
                              updateBoundary(index, e.target.value)
                            }
                            className='covar_card_boundary_slider'
                          />
                          <div className='covar_card_slider_track_labels'>
                            <span>
                              {(index === 0
                                ? minValue
                                : boundaries[index - 1]
                              ).toFixed(1)}
                            </span>
                            <span>
                              {(index === boundaries.length - 1
                                ? maxValue
                                : boundaries[index + 1]
                              ).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>,
                );

                if (index === boundaries.length - 1) {
                  items.push(
                    <div
                      key={`bucket-${index + 2}`}
                      className={`covar_card_bucket_item covar_card_bucket_item--${(index + 1) % 3}`}
                    >
                      <div className='covar_card_bucket_header'>
                        <span className='covar_card_bucket_label'>
                          Bucket {index + 2}
                        </span>
                      </div>
                      <div className='covar_card_bucket_range'>
                        <span className='covar_card_range_value'>
                          {boundaries[index].toFixed(2)}
                        </span>
                        <span className='covar_card_range_separator'>to</span>
                        <span className='covar_card_range_value'>
                          {maxValue.toFixed(2)}
                        </span>
                      </div>
                      <div className='covar_card_bucket_info'>
                        <span>
                          {inclusiveLower[index]
                            ? `${boundary.toFixed(2)} < `
                            : `${boundary.toFixed(2)} ≤ `}
                          values
                          {` ≤ ${maxValue.toFixed(2)}`}
                        </span>
                      </div>
                    </div>,
                  );
                }

                return items;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
