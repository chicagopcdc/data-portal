import { useState } from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import Button from '@src/gen3-ui-component/components/Button';

storiesOf('Buttons', module)
  .add('Primary', () => (
    <Button
      buttonType='primary'
      label='Primary Button'
      onClick={() => action('button click')('primary')}
      leftIcon='download'
      rightIcon='copy'
    />
  ))
  .add('Secondary', () => (
    <Button
      buttonType='secondary'
      label='Secondary Button'
      onClick={() => action('button click')('secondary')}
      leftIcon='download'
      rightIcon='copy'
    />
  ))
  .add('Default', () => (
    <Button
      buttonType='default'
      label='Default Button'
      onClick={() => action('button click')('default')}
      leftIcon='download'
      rightIcon='copy'
    />
  ))
  .add('Disabled', () => (
    <Button
      buttonType='primary'
      label='Disabled Button'
      onClick={() => action('button click')('disabled')}
      enabled={false}
      leftIcon='download'
      rightIcon='copy'
    />
  ))
  .add('Multiple w/ Tooltip', () => (
    <div style={{ display: 'flex' }}>
      <Button
        buttonType='primary'
        label='Tooltip Button 1'
        onClick={() => action('button click')('tooltip')}
        leftIcon='download'
        rightIcon='copy'
        tooltipEnabled
        tooltipText='This is a tooltip a user could use to display a message.'
      />
      <Button
        buttonType='primary'
        label='Tooltip Button 2'
        enabled={false}
        onClick={() => action('button click')('tooltip')}
        leftIcon='download'
        rightIcon='copy'
        tooltipEnabled
        tooltipText='This would describe why the button is disabled.'
      />
      <Button
        buttonType='primary'
        label='Tooltip Button 3'
        onClick={() => action('button click')('tooltip')}
        leftIcon='download'
        rightIcon='copy'
        tooltipEnabled
        tooltipText='This is a tooltip a user could use to display a message.'
      />
    </div>
  ))
  .add('Loading state', () => {
    const [isLoading, setIsLoading] = useState(false);
    function mockLoadData() {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    }
    return (
      <Button
        buttonType='primary'
        label='Loading Button'
        onClick={mockLoadData}
        leftIcon='download'
        rightIcon='copy'
        isPending={isLoading}
      />
    );
  });
