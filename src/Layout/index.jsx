import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { components } from '../params';
import isEnabled from '../helpers/featureFlags';
import { userapiPath } from '../localconf';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { receiveUser } from '../redux/user/slice';
import { fetchWithCreds } from '../utils.fetch';
import dictIcons from '../img/icons/index';
import ReduxFooter from './ReduxFooter';
import ScreenSizeWarning from '../components/ScreenSizeWarning';
import ReduxTopBar from './ReduxTopBar';
import ReduxNavBar from './ReduxNavBar';
import ExplorerWizard, {
  getExplorerWizardVersion,
  ONBOARDING_VERSION_FIELD,
  OPEN_EXPLORER_WIZARD_EVENT,
} from '../GuppyDataExplorer/ExplorerWizard';
import './Layout.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
function Layout({ children }) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const [isExplorerWizardOpen, setExplorerWizardOpen] = useState(false);

  const isDashboardPage =
    location.pathname.toLowerCase().startsWith('/dd') ||
    location.pathname.toLowerCase().startsWith('/explorer');

  useEffect(() => {
    function openExplorerWizard() {
      setExplorerWizardOpen(true);
    }

    window.addEventListener(OPEN_EXPLORER_WIZARD_EVENT, openExplorerWizard);
    return () =>
      window.removeEventListener(
        OPEN_EXPLORER_WIZARD_EVENT,
        openExplorerWizard,
      );
  }, []);

  const markExplorerWizardCompleted = useCallback(() => {
    const version = getExplorerWizardVersion();
    if (version === null) return;

    const additionalInfo = {
      ...(user.additional_info ?? {}),
      [ONBOARDING_VERSION_FIELD]: version,
    };

    fetchWithCreds({
      body: JSON.stringify(additionalInfo),
      method: 'PUT',
      path: `${userapiPath}user/`,
    })
      .then(({ data, status }) => {
        if (status < 200 || status >= 300)
          throw new Error(
            `Failed to save Explorer Guide completion: ${status}`,
          );

        dispatch(
          receiveUser({
            ...user,
            ...(data && typeof data === 'object' ? data : {}),
            additional_info:
              data && typeof data === 'object' && data.additional_info
                ? data.additional_info
                : additionalInfo,
          }),
        );
      })
      .catch((error) => {
        // If saving fails, the backend will not record the version and the
        // guide can be shown again on the next page load.
        console.error(error);
      });
  }, [dispatch, user]);

  return (
    <>
      {isEnabled('noIndex') && (
        <Helmet>
          <meta name='robots' content='noindex,nofollow' />
        </Helmet>
      )}
      <header>
        <ReduxTopBar config={components.topBar} />
        <ReduxNavBar
          dictIcons={dictIcons}
          navItems={components.navigation.items}
          navTitle={components.navigation.title}
        />
      </header>
      <main className='main'>{children}</main>
      {isDashboardPage || (
        <ReduxFooter
          links={components.footer?.links}
          logos={components.footerLogos}
          privacyPolicy={components.privacyPolicy}
        />
      )}
      {isExplorerWizardOpen && (
        <ExplorerWizard
          isOpen={isExplorerWizardOpen}
          onClose={() => setExplorerWizardOpen(false)}
          onDone={markExplorerWizardCompleted}
        />
      )}
      <ScreenSizeWarning />
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default Layout;
