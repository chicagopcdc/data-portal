import './Banner.css';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchBannerMessage } from '../../redux/messageBanner/asyncThunks';

export default function Banner() {
  const dispatch = useAppDispatch();
  const [showBanner, setShowBanner] = useState(true);
  const [msg, setMsg] = useState(null);
  const { messages, status } = useAppSelector((state) => state.messageBanner);

  // use fetchBannerMessage thunk to dispatch
  useEffect(() => {
    dispatch(fetchBannerMessage());
  }, [dispatch]);

  // set the message shown on the banner to be the first one received
  // from array given by API endpoint '/amanuensis/notifications' (unread notifications)
  // if that array is empty, then no banner is shown
  function assignMsg() {
    if (messages.length === 0) {
      setShowBanner(false);
    } else {
      setMsg(messages[0].message);
    }
  }
  useEffect(assignMsg, [messages]);

  return (
    <>
      {showBanner && status === 'successful' && (
        <div className='message-banner'>
          <div className='banner-text'>
            <p> {msg} </p>
            <p>
              To view dismissed messages, go to the Message Center (Profile →
              Message Center).
            </p>
          </div>
          <button
            className='exit-button'
            onClick={() => {
              setShowBanner(false);
            }}
          >
            X
          </button>
        </div>
      )}
    </>
  );
}
