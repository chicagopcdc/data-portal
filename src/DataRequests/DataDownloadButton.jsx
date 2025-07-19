import PropTypes from 'prop-types';
import { useState } from 'react';
import Button from '../gen3-ui-component/components/Button';

/** @param {{ project: import("./index.jsx").DataRequestProject }} props */
function DataDownloadButton({ project }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleClick() {
    if (isError) setIsError(false);
    setIsLoading(true);
    fetch(`/amanuensis/download-urls/${project.id}`)
      .then((res) => res.json())
      .then((data) =>
        window.open(data.download_url, '_blank', 'noopener, noreferrer'),
      )
      .catch((err) => {
        setIsError(true);
        throw err;
      })
      .finally(() => setIsLoading(false));
  }

  const isButtonEnabled =
    (project.status === 'Data Available' ||
      project.status === 'Data Downloaded') &&
    project.approved_url_present &&
    project.has_access;
  return (
    <div className='download-button'>
      <Button
        buttonType='primary'
        enabled={isButtonEnabled}
        onClick={handleClick}
        label='Download Data'
        rightIcon='download'
        isPending={isLoading}
      />
      {isError && (
        <p className='download-button__error-message'>
          Something went wrong! Try again.
        </p>
      )}
    </div>
  );
}

DataDownloadButton.propTypes = {
  project: PropTypes.shape({
    has_access: PropTypes.bool,
    id: PropTypes.number,
    status: PropTypes.string,
  }),
};

export default DataDownloadButton;
