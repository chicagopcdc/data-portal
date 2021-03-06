import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import CommonsLogin from '../../gen3-ui-component/components/CommonsLogin/.';
import kfLogo from '../../gen3-ui-component/images/logos/kf-logo.png';

storiesOf('Login', module)
  .add('CommonsLogin', () => (
    <div style={{ width: '250px' }}>
      <CommonsLogin
        title='KidsFirst'
        logoSrc={kfLogo}
        buttonTitle='Connect'
        onButtonClick={() => action('login click')('kf')}
      />
    </div>
  ))
  .add('CommonsLogin with message', () => (
    <div style={{ width: '250px' }}>
      <CommonsLogin
        title='KidsFirst'
        logoSrc={kfLogo}
        buttonTitle='Disconnect'
        onButtonClick={() => action('logout click')('kf')}
        message='Connected!'
        buttonType='primary'
      />
    </div>
  ));
