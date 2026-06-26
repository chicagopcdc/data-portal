import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { components } from '../params';
import isEnabled from '../helpers/featureFlags';
import dictIcons from '../img/icons/index';
import ReduxFooter from './ReduxFooter';
import ScreenSizeWarning from '../components/ScreenSizeWarning';
import ReduxTopBar from './ReduxTopBar';
import ReduxNavBar from './ReduxNavBar';
import ExplorerWizard, {
  OPEN_EXPLORER_WIZARD_EVENT,
} from '../GuppyDataExplorer/ExplorerWizard';
import './Layout.css';

function markExplorerWizardCompleted() {
  window.localStorage.setItem(ExplorerWizard.COMPLETION_STORAGE_KEY, 'true');
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
function Layout({ children }) {
  const location = useLocation();
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
