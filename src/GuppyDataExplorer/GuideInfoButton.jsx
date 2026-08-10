import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import {
  isExplorerSubGuideEnabled,
  openExplorerSubGuide,
} from './ExplorerWizard';

function GuideInfoButton({ guideId, label }) {
  if (!isExplorerSubGuideEnabled(guideId)) return null;

  return (
    <button
      aria-label={label}
      className='explorer-guide-info-button'
      onClick={() => openExplorerSubGuide(guideId)}
      title={label}
      type='button'
    >
      <FontAwesomeIcon icon='circle-info' />
    </button>
  );
}

GuideInfoButton.propTypes = {
  guideId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

export default GuideInfoButton;
