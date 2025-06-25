import './Banner.css';
import { useState } from 'react';

export default function Banner() {
  const [showBanner, setShowBanner] = useState(true);

  function handleExitBanner() {
    setShowBanner(false);
  }

  const msg = 'THIS IS WHERE THE MESSAGE BANNER IS.';

  return (
    <>
      {showBanner && (
        <div className='message-banner'>
          <div className='banner-text'>
            <p> {msg} </p>
            <p>
              To view dismissed messages, go to the Message Center (Profile →
              Message Center).
            </p>
          </div>
          <button className='exit-button' onClick={handleExitBanner}>
            X
          </button>
        </div>
      )}
    </>
  );
}
