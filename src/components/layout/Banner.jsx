import './Banner.css';
import { useState, useEffect } from 'react';

export default function Banner() {
  const [showBanner, setShowBanner] = useState(true);
  const [bannerData, setBannerData] = useState([]);

  function handleExitBanner() {
    setShowBanner(false);
  }

  useEffect(() => {
    fetch('/amanuensis/notifications', {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch notifications.');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Notifications: ', data);
        setBannerData(data);
      })
      .catch((error) => {
        console.error('Fetch error:', error);
      });
  }, []);

  // set the message shown on the banner to be the first one received
  // from array given by API endpoint '/amanuensis/notifications' (unread notifications)
  // if that array is empty, then no banner is shown
  let msg;
  function setMsg() {
    if (bannerData.length === 0) {
      msg = null;
      setShowBanner(false);
    } else {
      msg = bannerData[0];
    }
  }
  useEffect(setMsg, [bannerData]);

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
