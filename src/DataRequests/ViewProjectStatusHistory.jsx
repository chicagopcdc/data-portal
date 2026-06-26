import { useEffect, useState } from 'react';
import { useAppDispatch } from '../redux/hooks.js';
import { fetchWithCreds } from '../utils.fetch.js';
import './ViewProjectStatusHistory.css';

export default function ViewProjectStatusHistory({ projectId }) {
  const dispatch = useAppDispatch();
  const [projectStatusHistory, setProjectStatusHistory] = useState({});
  const [isActionPending, setActionPending] = useState(false);
  const [actionRequestError, setRequestactionError] = useState({
    isError: false,
    message: '',
  });
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (consortiumCode) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [consortiumCode]: !prev[consortiumCode],
    }));
  };

  const formatDate = (dateString) => {
    // If dateString does not end with Z or a timezone, treat as UTC
    const safeDateString =
      dateString && !dateString.endsWith('Z') && !dateString.includes('+')
        ? dateString + 'Z'
        : dateString;
    const date = new Date(safeDateString);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimeZone,
    });
  };
  useEffect(() => {
    if (!projectId) return;
    setProjectStatusHistory({});
    const fetchUrl = async () => {
      // response.json = {"INRG": [{"state": "IN_REVIEW", "create_date": "2023-01-01T00:00:00"}],
      //                  "INSTRUCT": [
      //                         {"state": "IN_REVIEW", "create_date": "2023-01-02T00:00:00"},
      //                         {"state": "APPROVED", "create_date": "2023-01-01T00:00:00"}
      //                 ]
      //                 }
      try {
        setActionPending(true);
        const result = await fetchWithCreds({
          path: `/amanuensis/admin/project/status-history/${projectId}`,
          method: 'GET',
        });
        if (result.status === 200) {
          setProjectStatusHistory(result.data);
        } else {
          setRequestactionError({
            isError: true,
            message: result.data,
          });
        }
      } catch {
        setProjectStatusHistory({});
      } finally {
        setActionPending(false);
      }
    };
    fetchUrl();
  }, [projectId]);

  if (actionRequestError.isError) {
    return (
      <div className='status-history__error'>
        <h2>Error Loading Status History</h2>
        <p>{actionRequestError.message}</p>
      </div>
    );
  }

  if (isActionPending) {
    return (
      <div className='status-history__loading'>
        <h2>Loading Status History...</h2>
      </div>
    );
  }

  const consortiumCodes = Object.keys(projectStatusHistory);

  if (consortiumCodes.length === 0) {
    return (
      <div className='status-history__empty'>
        <h2>No Status History Available</h2>
      </div>
    );
  }

  return (
    <div className='status-history'>
      <div className='status-history__header'>
        <h2>Project Status History</h2>
      </div>
      <div className='status-history__content'>
        {consortiumCodes.map((consortiumCode) => {
          const statusHistory = projectStatusHistory[consortiumCode];
          const currentStatus = statusHistory[0]; // First element is current state
          const isOpen = openDropdowns[consortiumCode];

          return (
            <div key={consortiumCode} className='status-history__dropdown'>
              <button
                className='status-history__dropdown-trigger'
                onClick={() => toggleDropdown(consortiumCode)}
                aria-expanded={isOpen}
              >
                <div className='status-history__dropdown-header'>
                  <span className='status-history__consortium-code'>
                    {consortiumCode}
                  </span>
                  <span
                    className={`status-history__current-status status-history__status--${currentStatus.state.toLowerCase().replace('_', '-')}`}
                  >
                    {currentStatus.state.replace('_', ' ')}
                  </span>
                </div>
                <div
                  className={`status-history__dropdown-arrow ${isOpen ? 'status-history__dropdown-arrow--open' : ''}`}
                >
                  ▼
                </div>
              </button>

              {isOpen && (
                <div className='status-history__dropdown-content'>
                  <div className='status-history__dropdown-list'>
                    {statusHistory.map((status, index) => (
                      <div
                        key={index}
                        className='status-history__dropdown-item'
                      >
                        <div className='status-history__item-content'>
                          <span
                            className={`status-history__status status-history__status--${status.state.toLowerCase().replace('_', '-')}`}
                          >
                            {status.state.replace('_', ' ')}
                          </span>
                          <span className='status-history__date'>
                            {formatDate(status.create_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
