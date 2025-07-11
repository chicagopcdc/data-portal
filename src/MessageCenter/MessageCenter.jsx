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

  // Note: to see the message center's 'hide expired messages" function and how it truncates
  // longer messages, uncomment fullMessages and replace it on line 71 (in setAllNotifData())
  // let fullMessages = [
  //   {
  //     create_date: new Date('2025-06-22'),
  //     message:
  //       'React can change how you think about the designs you look at and the apps you build. When you build a user interface with React, you will first break it apart into pieces called components. Then, you will describe the different visual states for each of your components. Finally, you will connect your components together so that the data flows through them. In this tutorial, we’ll guide you through the thought process of building a searchable product data table with React.',
  //     active: false,
  //   },
  //   {
  //     create_date: new Date('2025-06-23'),
  //     message:
  //       'Spyridon Marinatos (Greek: Σπυρίδων Μαρινάτος; 17 November [O.S. 4 November] 1901[a] – 1 October 1974) was a Greek archaeologist who specialised in the Minoan and Mycenaean civilizations of the Aegean Bronze Age. He is best known for the excavation of the Minoan site of Akrotiri on Thera,[b] which he conducted between 1967 and 1974. He received many honours in Greece and abroad, and was considered one of the most important Greek archaeologists of his day.  A native of Kephallonia, Marinatos was educated at the University of Athens, the Friedrich Wilhelms University of Berlin, and the University of Halle. His early teachers included noted archaeologists such as Panagiotis Kavvadias, Christos Tsountas and Georg Karo. He joined the Greek Archaeological Service in 1919, and spent much of his early career on the island of Crete, where he excavated several Minoan sites, served as director of the Heraklion Museum, and formulated his theory that the collapse of Neopalatial Minoan society had been the result of the eruption of the volcanic island of Thera around 1600 BCE.  In the 1940s and 1950s, Marinatos surveyed and excavated widely in the region of Messenia in south-west Greece, collaborating with Carl Blegen, who was engaged in the simultaneous excavation of the Palace of Nestor at Pylos. He also discovered the battlefield of Thermopylae and excavated the Mycenaean cemeteries at Tsepi and Vranas near Marathon in Attica.  Marinatos was head of the Greek Archaeological Service from 1937 to 1939, from 1955 to 1958, and and lastly from 1967 to 1974, under the Greek military junta. He was an enthusiastic supporter of the junta; in the late 1930s, he had been close to the quasi-fascist dictatorship of Ioannis Metaxas, under whom he initiated legislation to restrict the roles of women in Greek archaeology. His leadership of the Archaeological Service has been criticised for its cronyism and for promoting the pursuit of grand discoveries at the expense of good scholarship. Marinatos died while excavating at Akrotiri in 1974, and is buried at the site.  Life Early career and education Spyridon Marinatos was born in Lixouri on the Ionian island of Kephallonia on 17 November [O.S. 4 November] 1901. His father, Nikolaos, was a carpenter.[2] Marinatos studied at the University of Athens from 1916,[3] where he competed unsuccessfully with Christos Karouzos for a scholarship, beginning a lifelong rivalry between the two.[4] Marinatos joined the Greek Archaeological Service in 1919 and was first posted to Crete as an epimelitis (junior archaeological official).[5] His early excavations on Crete included the Minoan villa at Amnisos,[6] and he continued to excavate on the island periodically between 1919 and 1952.[7]  Marinatos was one of the first thirty-six students of the "Practical School of Art History", an archaeological training centre established by the Archaeological Society of Athens at the request of the Greek government, studying there in the 1919–1920 academic year.',
  //     active: false,
  //   },
  //   {
  //     create_date: new Date('2025-06-27'),
  //     message:
  //       'The National Geographic Society Headquarters is a historic complex of buildings in Washington, D.C., United States. The complex was constructed in phases beginning in 1904 to house the offices and museum of the National Geographic Society, a scientific and educational nonprofit institution that has been headquartered in Washington since its 1888 founding. The historical portion of the site consists of three buildings: the 1904 original structure Hubbard Hall, the adjoining Administration Building, of which the north wing was constructed during 1912–1913, and the south wing and central pavilion in 1932; and the 1963–1964 Stone Building. A fourth building constructed in 1984 is too modern to be considered a contributing structure to the historical segment of the complex.',
  //     active: false,
  //   },
  // ];

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
