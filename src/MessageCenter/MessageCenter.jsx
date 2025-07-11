import React, { useState, useEffect } from 'react';
import './MessageCenter.css';
import Button from '../gen3-ui-component/components/Button';

// if messages are longer than LONG_MESSAGE_LEN (# of characters), then they are
// truncated and rendered with a "more" button that expands the message in full
// in a dialog modal
const LONG_MESSAGE_LEN = 400;

function MessageCenter() {
  const tableHeader = ['Date', 'Expired', 'Message'];
  const [msgIdx, toggleMsgIdx] = useState(null); // for toggling which message is shown in full
  const [allNotifData, setAllNotifData] = useState([]); // for all messages from the API endpoint
  const [notifData, setNotifData] = useState([]); // for non-expired messages from the API endpoint
  const [showExpiredMsgs, toggleShowExpiredMsgs] = useState(true); // for hiding/showing expired messages

  // renders and dismisses the message when clicking on message subject
  function handleMessageClick(index) {
    toggleMsgIdx((prevMessageStatus) =>
      prevMessageStatus === null ? toggleMsgIdx(index) : toggleMsgIdx(null),
    );
  }

  function handleExpMsgClick() {
    toggleMsgIdx(null);
    toggleShowExpiredMsgs((prevState) => !prevState);
  }

  function truncateMessage(message) {
    const shorterMessage = message.substring(0, LONG_MESSAGE_LEN);
    const lastSpaceIdx = shorterMessage.lastIndexOf(' ');
    return message.substring(0, lastSpaceIdx) + '...';
  }

  // fetches from API endpoint
  useEffect(() => {
    fetch('/amanuensis/notifications/all', {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch notifications');
        }
        return res.json();
      })
      .then((data) => {
        setAllNotifData(data);
      })
      .catch((error) => {
        console.error('Fetch error:', error);
      });
  }, []);

  useEffect(() => {
    if (!showExpiredMsgs) {
      setNotifData(allNotifData.filter((msg) => msg.active));
    } else {
      setNotifData(allNotifData);
    }
  }, [showExpiredMsgs, allNotifData]);

  return (
    <div>
      <h2>Your Message Center</h2>
      <Button
        className=' g3-button g3-button--primary'
        id='expire-message-hide'
        label={
          showExpiredMsgs ? 'Hide expired messages' : 'Show expired messages'
        }
        onClick={handleExpMsgClick}
      />

      <table className='message_center_container'>
        <thead>
          <tr>
            {tableHeader.map((header, idx) => (
              <th key={idx}>{header}</th>
            ))}
          </tr>
          {notifData.length === 0 && (
            <tr>
              <td colSpan={tableHeader.length}>
                <h3> There are no active messages. </h3>
              </td>
            </tr>
          )}
        </thead>

        <tbody>
          {notifData.map((msg, index) => (
            <React.Fragment key={index}>
              <tr className='row-content'>
                <td className='row-content'>
                  {new Date(msg.create_date).toLocaleDateString()}
                </td>
                <td className='row-content'>{msg.active ? 'False' : 'True'}</td>
                <td className='row-content'>
                  {msg.message.length <= LONG_MESSAGE_LEN && msg.message}
                  {msg.message.length > LONG_MESSAGE_LEN && (
                    <>
                      {msgIdx === null && truncateMessage(msg.message)}
                      {msgIdx === index && msg.message}
                      {msgIdx !== null &&
                        msgIdx !== index &&
                        truncateMessage(msg.message)}
                      <p>
                        <button
                          onClick={() => handleMessageClick(index)}
                          className='more-close-button'
                        >
                          {msgIdx === index ? 'Close' : 'More'}
                        </button>
                      </p>
                    </>
                  )}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MessageCenter;
