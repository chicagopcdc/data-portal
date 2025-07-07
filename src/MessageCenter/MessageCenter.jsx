import React, { useState, useEffect } from 'react';
import './MessageCenter.css';

function MessageCenter() {
  const tableHeader = ['ID', 'Date', 'Expiration Date'];

  // when msgIdx is null: no message is rendered
  // else, renders the message with the index msgIdx
  const [msgIdx, toggleMsgIdx] = useState(null);
  const [notifData, setNotifData] = useState([]);

  // renders and dismisses the message when clicking on message subject
  function handleMessageClick(index) {
    toggleMsgIdx((prevMessageStatus) =>
      prevMessageStatus === null ? toggleMsgIdx(index) : toggleMsgIdx(null),
    );
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
        setNotifData(data);
      })
      .catch((error) => {
        console.error('Fetch error:', error);
      });
  }, []);

  return (
    <div>
      <h2>Your Message Center</h2>
      <table className='message_center_container'>
        <thead>
          <tr>
            <th>{tableHeader[0]}</th>
            <th>{tableHeader[1]}</th>
            <th>{tableHeader[2]}</th>
          </tr>
        </thead>
        <tbody>
          {notifData.map((msg, index) => (
            <React.Fragment key={index}>
              <tr
                className='row-content'
                onClick={() => handleMessageClick(index)}
              >
                <td className='row-content' id='id'>
                  {msg.id}
                </td>
                <td className='row-content'>
                  {new Date(msg.create_date).toLocaleDateString()}
                </td>
                <td className='row-content'>
                  {new Date(msg.expiration_date).toLocaleDateString()}
                </td>
              </tr>
              {msgIdx === index && (
                <tr>
                  <td colSpan={tableHeader.length} className='message-box'>
                    {msg.message}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MessageCenter;
