import Table from '../components/tables/base/Table';
import { useState } from 'react';
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

  // derive hyperlinked_titles and tableData from fullMessages to render Table
  const hyperlinked_titles = fullMessages.map((message, messageIndex) => (
    <a onClick={() => handleMessageClick(messageIndex)}>{message.title}</a>
  ));

  const tableData = [];
  for (const [messageIndex, message] of fullMessages.entries()) {
    tableData.push([hyperlinked_titles[messageIndex], message.date]);
  }

  // when msgIdx is null: no message is rendered
  // else, renders the message from fullMessages[msgIdx].message
  const [msgIdx, toggleMsgIdx] = useState(null);

  // renders and dismisses the message when clicking on message subject
  function handleMessageClick(tileIndex) {
    toggleMsgIdx((prevMessageStatus) =>
      prevMessageStatus === null ? toggleMsgIdx(tileIndex) : toggleMsgIdx(null),
    );
  }

  return (
    <>
      <div className='message_center_container'>
        <h2> Your Message Center </h2>
        <Table header={tableHeader} data={tableData} />
        {msgIdx !== null && (
          <div className='message-box'>
            <p> {fullMessages[msgIdx].message} </p>
          </div>
        )}
      </div>
    </>
  );
}
export default MessageCenter;
