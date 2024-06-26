/** ************************************************
/* NOTE: This is a simplified copy and paste of the
/* Login.jsx code for the multi-commons workspace POC.
/* WE SHOULD REUSE CODE INSTEAD
************************************************** */

import { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import Button from '../gen3-ui-component/components/Button';
import { overrideSelectTheme } from '../utils';
import './Workspace.css';
import '../Login/Login.css';

const getLoginUrl = (providerLoginUrl) => {
  const queryChar = providerLoginUrl.includes('?') ? '&' : '?';
  return `${providerLoginUrl}${queryChar}redirect=${window.location.pathname}`;
};

class WorkspaceLogin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLoginOption: {}, // one for each login dropdown
    };
  }

  selectChange = (selectedOption, index) => {
    this.setState((prevState) => ({
      selectedLoginOption: {
        ...prevState.selectedLoginOption,
        [index]: selectedOption,
      },
    }));
  };

  render() {
    const loginOptions = {}; // one for each login provider
    const filterOptions = {};
    this.props.providers.forEach((provider, i) => {
      // sort login options by name
      const loginUrls = provider.urls.sort((a, b) => {
        if (a.name.trim() > b.name.trim()) {
          return 1;
        }
        if (b.name.trim() > a.name.trim()) {
          return -1;
        }
        return 0;
      });
      // URLs in format expected by Select component
      loginOptions[i] = loginUrls.map((e) => ({
        value: e.url,
        label: e.name,
      }));
    });

    return (
      <div className='login-page__central-content'>
        {this.props.providers.length > 0 ? (
          <h2>Link accounts from other Data Commons</h2>
        ) : null}
        {this.props.providers.map((p, i) => (
          <Fragment key={i}>
            <div className='login-page__entries'>
              <div className='login-page__entry-login'>
                {
                  // if there are multiple URLs, display a dropdown next
                  // to the login button
                  !p.refresh_token_expiration && loginOptions[i].length > 1 && (
                    <Select
                      aria-label='Login options'
                      isClearable
                      isSearchable
                      options={loginOptions[i]}
                      filterOptions={filterOptions[i]}
                      onChange={(option) => this.selectChange(option, i)}
                      value={
                        this.state.selectedLoginOption &&
                        this.state.selectedLoginOption[i]
                      }
                      theme={overrideSelectTheme}
                    />
                  )
                }

                <Button
                  className='login-page__entry-button'
                  onClick={() => {
                    window.location.href = getLoginUrl(
                      loginOptions[i].length > 1
                        ? this.state.selectedLoginOption[i].value
                        : loginOptions[i][0].value
                    );
                  }}
                  label={
                    p.refresh_token_expiration
                      ? `${p.name} (expires in ${p.refresh_token_expiration})`
                      : p.name
                  }
                  buttonType={p.secondary ? 'default' : 'primary'}
                  enabled={!p.refresh_token_expiration}
                />
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    );
  }
}

WorkspaceLogin.propTypes = {
  providers: PropTypes.array,
};

WorkspaceLogin.defaultProps = {
  providers: [],
};

export default WorkspaceLogin;
