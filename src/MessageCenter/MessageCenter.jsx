import React, { useState, useEffect } from 'react';
import { fetchMessages } from '../redux/messageCenter/asyncThunks';
import Button from '../gen3-ui-component/components/Button';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import './MessageCenter.css';

// if messages are longer than LONG_MESSAGE_LEN (# of characters), then they are
// truncated and rendered with a "more" button that expands the message in full
// in a dialog modal
const LONG_MESSAGE_LEN = 400;

function MessageCenter() {
  const tableHeader = ['Date', 'Expired', 'Message'];
  const dispatch = useAppDispatch();
  const [msgIdx, toggleMsgIdx] = useState(null); // for toggling which message is shown in full
  const [showExpiredMsgs, toggleShowExpiredMsgs] = useState(true); // for hiding/showing expired messages
  const { messages, status } = useAppSelector((state) => state.messageCenter);

  const notifData = showExpiredMsgs
    ? messages
    : messages.filter((msg) => msg.active);

  useEffect(() => {
    dispatch(fetchMessages());
  }, [dispatch]);

  /** renders and dismisses the message when clicking on message subject
   * @param {number} index */
  function handleMessageClick(index) {
    toggleMsgIdx((prev) => (prev === index ? null : index));
  }

  /** handles the button click for 'Hide/show expired messages' */
  function handleExpMsgClick() {
    toggleMsgIdx(null);
    toggleShowExpiredMsgs((prevState) => !prevState);
  }

  /** Truncates a message to the last full word before length LONG_MESSAGE_LEN
   * @param {string} message
   * @returns {string} the truncated message, with added ellipses */
  function truncateMsg(message) {
    const shorterMessage = message.substring(0, LONG_MESSAGE_LEN);
    const lastSpaceIdx = shorterMessage.lastIndexOf(' ');
    return message.substring(0, lastSpaceIdx) + '...';
  }

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
          {notifData.length === 0 && status === 'succeeded' && (
            <tr>
              <td colSpan={tableHeader.length}>
                <h3> There are no active messages. </h3>
              </td>
            </tr>
          )}
        </thead>

        <tbody>
          {notifData.map((msg, index) => {
            const isLong = msg.message.length > LONG_MESSAGE_LEN;
            const isSelected = msgIdx === index;
            const formattedDate = new Date(
              msg.create_date,
            ).toLocaleDateString();
            return (
              <React.Fragment key={index}>
                <tr className='row-content'>
                  <td className='row-content'>{formattedDate}</td>
                  <td className='row-content'>
                    {msg.active ? 'False' : 'True'}
                  </td>
                  <td className='row-content'>
                    {!isLong && msg.message}
                    {isLong && (
                      <>
                        {isSelected ? msg.message : truncateMsg(msg.message)}
                        <p>
                          <button
                            onClick={() => handleMessageClick(index)}
                            className='more-close-button'
                          >
                            {isSelected ? 'Close' : 'More'}
                          </button>
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MessageCenter;
