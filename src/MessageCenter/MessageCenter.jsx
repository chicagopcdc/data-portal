import React, { useState, useEffect} from 'react';
import './MessageCenter.css';

function MessageCenter() {
  const tableHeader = ['Subject', 'Date'];
  const fullMessages = [
    {
      title: 'Routine website maintenance',
      date: new Date('2025-06-22'),
      message:
        'Please be advised that there will be a scheduled maintenance on 6/18/25, 6 PM CT to 9 PM CT.',
    },
    {
      title: 'Your updated login',
      date: new Date('2025-06-23'),
      message:
        'You have updated your login! If you have not done so, please report this instance to support@gmail.com.',
    },
    {
      title: 'New study available',
      date: new Date('2025-06-27'),
      message: 'A new study is available for viewing.',
    },
  ];

  // when msgIdx is null: no message is rendered
  // else, renders the message from fullMessages[msgIdx].message
  const [msgIdx, toggleMsgIdx] = useState(null);

  // renders and dismisses the message when clicking on message subject
  
  function handleMessageClick(tileIndex) {
   toggleMsgIdx((prevMessageStatus) =>
      prevMessageStatus === null ? toggleMsgIdx(tileIndex) : toggleMsgIdx(null),
    );
  }

  // useEffect(() => {
  //   fetch('/amanuensis/notifications/', {
  //     method: 'GET',
  //     credentials: 'include', 
  //   })
  //       .then((res) => {
  //           if (!res.ok) {
  //               throw new Error('Failed to fetch notifications');
  //           }
  //           return res.json();
  //       })
  //       .then(data => {
  //         console.log('Notifications:', data);
  //       })
  //       .catch((error) => {
  //           console.error("Fetch error:", error);
  //       });
  // }, []);

return (
    <div>
      <h2>Your Message Center</h2>
      <table className='message_center_container'>
        <thead>
          <tr>
            <th>{tableHeader[0]}</th>
            <th>{tableHeader[1]}</th>
          </tr>
        </thead>
        <tbody>
          {fullMessages.map((msg, index) => (
            <React.Fragment key={index}>
              <tr 
                className='row-content'
                onClick={() => handleMessageClick(index)}
              >
                <td className='row-content' id='title'>{msg.title}</td>
                <td className='row-content'>{msg.date.toLocaleDateString()}</td>
              </tr>
              {msgIdx === index && (
                <tr>
                  <td colSpan={2} className='message-box'>
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
