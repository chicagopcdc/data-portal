import { fireEvent, render, screen } from '@testing-library/react';
import ContinuousCovariate from './ContinuousCovariate';

const unitCalcConfig = {
  ageUnits: {
    quantity: 'age',
    desiredUnit: 'days',
    selectUnits: { months: 30, years: 365.25 },
  },
  calculatorMapping: { number: [], age: ['labs.age_at_lab'] },
};

let mockUnitCalcConfig = unitCalcConfig;
jest.mock('../../redux/hooks', () => ({
  useAppSelector: (selector) =>
    selector({
      explorer: { config: { filterConfig: { unitCalcConfig: mockUnitCalcConfig } } },
    }),
}));

function renderCovariate(label = 'labs.age_at_lab') {
  const updateCovariates = jest.fn();
  render(
    <ContinuousCovariate
      position={0}
      covariate={{ label, name: 'Age at Lab', type: 'continuous', values: [0, 10000] }}
      updateCovariates={updateCovariates}
    />,
  );
  return updateCovariates;
}

function convert(input, unit) {
  fireEvent.click(screen.getByRole('button', { name: /Compute age/ }));
  fireEvent.change(screen.getByLabelText('Input:'), { target: { value: input } });
  fireEvent.change(screen.getByLabelText('Unit:'), { target: { value: unit } });
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
}

describe('ContinuousCovariate unit calculator', () => {
  beforeEach(() => {
    mockUnitCalcConfig = unitCalcConfig;
  });

  it('adds the converted value as a split value for age fields', () => {
    const updateCovariates = renderCovariate();
    convert('2', 'years');
    fireEvent.click(screen.getByRole('button', { name: 'Add as split value' }));

    const update = updateCovariates.mock.calls.at(-1)[0];
    const [covariate] = update([{}]);
    expect(covariate.buckets).toEqual([{ splitValue: 730.5, inclusiveLower: true }]);
  });

  it('does not accept a value outside of the range', () => {
    renderCovariate();
    convert('100', 'years');
    expect(screen.getByRole('button', { name: 'Add as split value' })).toBeDisabled();
  });

  it('is not offered for fields that are not ages', () => {
    renderCovariate('labs.lab_result_numeric');
    expect(screen.queryByRole('button', { name: /Compute age/ })).not.toBeInTheDocument();
  });
});
