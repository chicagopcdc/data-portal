import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './ScreenSizeWarning.css';

function ScreenSizeWarning() {
  return ReactDOM.createPortal(
    <div className='screen-size-warning__container'>
      <FontAwesomeIcon
        className='screen-size-warning__icon'
        icon='triangle-exclamation'
        color='var(--pcdc-color__secondary)'
      />
      To get the full Data Commons experience, please switch to a larger screen.
    </div>,
    document.getElementById('root')
  );
}

export default ScreenSizeWarning;
