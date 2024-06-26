import { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { contactEmail } from '../localconf';
import Button from '../gen3-ui-component/components/Button';
import SimpleInputField from '../components/SimpleInputField';

/** @typedef {import('./types').UserDocument} UserDocument */
/** @typedef {import('./types').UserRegistrationInput} UserRegistrationInput */

/** @typedef {('input' | 'success' | 'error')} UserRegistrationView  */

/**
 * @param {Object} prop
 * @param {UserDocument[]} prop.docsToBeReviewed
 * @param {() => void} prop.onClose
 * @param {(userInput: UserRegistrationInput) => Promise<('success' | 'error')>} prop.onRegister
 * @param {(userInput: UserRegistrationInput) => void} prop.onSubscribe
 */
function RegistrationForm({
  docsToBeReviewed,
  onClose,
  onRegister,
  onSubscribe,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [institution, setInstitution] = useState('');

  /** @type {{ [id: number]: boolean }} */
  const initialReviewStatus = {};
  for (const { id } of docsToBeReviewed) initialReviewStatus[id] = false;
  const [reviewStatus, setReviewStatus] = useState(initialReviewStatus);

  const isAllDocumentsReviewed = Object.values(reviewStatus).every(Boolean);
  const isValidInput =
    firstName !== '' &&
    lastName !== '' &&
    institution !== '' &&
    isAllDocumentsReviewed;

  const initialView = /** @type {UserRegistrationView} */ ('input');
  const [currentView, setCurrentView] = useState(initialView);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  function handleRegister() {
    setIsRegistering(true);
    onRegister({ firstName, lastName, institution, reviewStatus }).then(
      (status) => {
        setIsRegistering(false);
        setCurrentView(status);
      }
    );
  }

  function handleClose() {
    if (isSubscribed) onSubscribe({ firstName, lastName, institution });
    onClose();
  }

  const viewInput = (
    <div className='user-popup__view-input'>
      <p>
        <FontAwesomeIcon
          icon='triangle-exclamation'
          color='var(--pcdc-color__secondary)'
        />
        Your account does not have access to PCDC data.
        <br />
        Please register to gain access.
      </p>
      <SimpleInputField
        label='First name'
        input={
          <input
            id='registration-first-name'
            type='text'
            value={firstName}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            disabled={isRegistering}
            placeholder='Enter your first name'
            required
            onChange={(e) => setFirstName(e.target.value)}
          />
        }
      />
      <SimpleInputField
        label='Last name'
        input={
          <input
            id='registration-last-name'
            type='text'
            value={lastName}
            disabled={isRegistering}
            placeholder='Enter your last name'
            required
            onChange={(e) => setLastName(e.target.value)}
          />
        }
      />
      <SimpleInputField
        label='Institution'
        input={
          <input
            id='registration-institution'
            type='text'
            value={institution}
            disabled={isRegistering}
            placeholder='e.g. University of Chicago'
            required
            onChange={(e) => setInstitution(e.target.value)}
          />
        }
      />
      <div className='user-popup__document-review-group'>
        {docsToBeReviewed.map((doc) => (
          <label key={doc.id}>
            <input
              type='checkbox'
              checked={reviewStatus[doc.id]}
              onChange={(e) => {
                e.persist();
                setReviewStatus((prev) => ({
                  ...prev,
                  [doc.id]: e.target.checked,
                }));
              }}
            />{' '}
            I have read and agree to the{' '}
            <a href={doc.formatted} target='_blank' rel='noreferrer'>
              {doc.name}
            </a>{' '}
            (v{doc.version})
          </label>
        ))}
      </div>
    </div>
  );

  const viewSuccess = (
    <div className='user-popup__view-success'>
      <h2>Thank you for registering!</h2>
      <p>
        You now have access to PCDC data based on your institutional
        affiliation.
      </p>
      <div className='user-popup__subscribe'>
        <input
          type='checkbox'
          checked={isSubscribed}
          onChange={(e) => setIsSubscribed(e.target.checked)}
        />
        Subscribe to the quarterly PCDC newsletter to get the latest updates on
        the PCDC project and more.
      </div>
    </div>
  );

  const viewError = (
    <div className='user-popup__view-error'>
      <FontAwesomeIcon
        icon='triangle-exclamation'
        color='var(--g3-color__rose)'
      />
      <h2>Error registering to gain access...</h2>
      <p>
        Please retry or refreshing the page. If the problem persists, please
        contact the administrator (
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) for more
        information.
      </p>
    </div>
  );

  return (
    <form className='user-popup__form'>
      {/* eslint-disable-next-line no-nested-ternary */}
      {currentView === 'input'
        ? viewInput
        : currentView === 'success'
        ? viewSuccess
        : viewError}
      <div>
        <Button
          label='Back to page'
          buttonType='default'
          onClick={handleClose}
        />
        {currentView !== 'success' && (
          <Button
            label={currentView === 'error' ? 'Retry' : 'Register'}
            enabled={isValidInput && !isRegistering}
            onClick={handleRegister}
          />
        )}
      </div>
    </form>
  );
}

RegistrationForm.propTypes = {
  docsToBeReviewed: PropTypes.array,
  onClose: PropTypes.func,
  onRegister: PropTypes.func,
  onSubscribe: PropTypes.func,
};

export default RegistrationForm;
