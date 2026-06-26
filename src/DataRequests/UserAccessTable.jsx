import { useEffect, useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  deleteProjectUser,
  getProjectUsers,
  updateUserDataAccess,
  getUserRoles,
} from '../redux/dataRequest/asyncThunks';
import Spinner from '../components/Spinner';
import Table from '../components/tables/base/Table';
import Button from '../gen3-ui-component/components/Button';

const tableHeader = ['User ID', 'Role', 'Actions'];
const filterConfig = {
  'User ID': true,
  Role: false,
  Actions: false,
};
export default function UserAccessTable({
  projectId,
  setActionType,
  onAction,
}) {
  const dispatch = useAppDispatch();

  const { userRoles, isUserRolesPending, userRolesError } = useAppSelector(
    (state) => state.dataRequest,
  );

  const [selectedRoles, setSelectedRoles] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const timeoutRef = useRef(null);
  const [fetchProjectUsersError, setFetchProjectUsersError] = useState(false);
  const [projectUsersPending, setProjectUsersPending] = useState(false);
  const [projectUsers, setProjectUsers] = useState([]);

  const submitGetProjectUsers = () => {
    setProjectUsersPending(true);
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */ dispatch(
        getProjectUsers(projectId),
      );
    actionRequest
      .then((action) => {
        if (action.payload.isError) {
          setFetchProjectUsersError(true);
          setProjectUsers([]);
        } else {
          setFetchProjectUsersError(false);
          setProjectUsers(action.payload);
        }
      })
      .finally(() => {
        setProjectUsersPending(false);
      });
  };

  const submitUserRemoval = (email) => {
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (dispatch(deleteProjectUser({ email, project_id: projectId })));
    actionRequest.then((action) => {
      if (action.payload.isError) {
        setErrorMsg(action.payload.message);
        setSuccessMsg('');
      } else {
        setSuccessMsg(`User ${email} removed successfully`);
        setErrorMsg('');
        onAction?.('SUCCESSFUL_USER_ACCESS_CHANGE');
      }
      submitGetProjectUsers();
      timeoutRef.current = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 3000);
    });
  };

  const submitRoleChange = (email) => {
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (
        dispatch(
          updateUserDataAccess({
            email,
            project_id: projectId,
            role: selectedRoles[email],
          }),
        )
      );
    actionRequest.then((action) => {
      if (!action.payload.isError) {
        setSuccessMsg(`Role updated successfully for ${email}`);
        onAction?.('SUCCESSFUL_USER_ACCESS_CHANGE');
        setErrorMsg('');
      } else {
        setErrorMsg(action.payload.message);
        setSuccessMsg('');
      }
      timeoutRef.current = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 3000);
    });
  };

  useEffect(() => {
    if (projectId) {
      submitGetProjectUsers();
    } else {
      setProjectUsers([]);
    }
  }, [projectId]);

  // Initialize selectedRoles when projectUsers are loaded
  useEffect(() => {
    if (projectUsers && projectUsers.length > 0) {
      setSelectedRoles(
        projectUsers.reduce((acc, user) => {
          acc[user.email] = user.role;
          return acc;
        }, {}),
      );
    }
  }, [projectUsers]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [successMsg, errorMsg],
  );

  useEffect(() => {
    if (userRolesError === true) {
      dispatch(getUserRoles());
    }
  }, [userRolesError]);

  const userRoleOptions = userRoles
    ? userRoles.map((role) => ({
        label: role.role,
        value: role.role,
      }))
    : [];
  const selectCustomStyle = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      borderColor: '#ccc',
      boxShadow: 'none',
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999, // Ensure the menu appears above the modal
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999, // Ensure the portal has a high z-index
    }),
  };

  const handleRoleChange = (email, selectedOption) => {
    setSelectedRoles((prevSelectedRoles) => ({
      ...prevSelectedRoles,
      [email]: selectedOption.value,
    }));
  };
  // Memoize table data to update only when projectUsers or selectedRoles change
  const tableData = useMemo(
    () =>
      projectUsers.map((user) => [
        user.email,
        <Select
          key={`select-${user.email}`}
          classNamePrefix='data-requests-select'
          options={userRoleOptions}
          value={{
            label: selectedRoles[user.email],
            value: selectedRoles[user.email],
          }}
          styles={selectCustomStyle}
          menuPortalTarget={document.body}
          onChange={(selectedOption) =>
            handleRoleChange(user.email, selectedOption)
          }
        />,
        <div className='data-requests__table-actions'>
          <Button
            label='Remove User'
            onClick={() => submitUserRemoval(user.email)}
          />
          <Button
            label='Change Permission'
            onClick={() => submitRoleChange(user.email)}
          />
        </div>,
      ]),
    [projectUsers, userRoleOptions],
  );

  return (
    <>
      {(projectUsersPending || isUserRolesPending) && <Spinner />}
      {fetchProjectUsersError && userRolesError && (
        <p style={{ color: 'red' }}>Error loading project users and roles</p>
      )}
      {fetchProjectUsersError && !userRolesError && (
        <p style={{ color: 'red' }}>Error loading project users</p>
      )}
      {!fetchProjectUsersError && userRolesError && (
        <p style={{ color: 'red' }}>Error loading project roles</p>
      )}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      <Table
        header={tableHeader}
        data={tableData}
        filterConfig={filterConfig}
      />
      <Button
        label='Add User'
        onClick={() => setActionType('PROJECT_USERS_ADD')}
      />
    </>
  );
}

UserAccessTable.propTypes = {
  projectId: PropTypes.number.isRequired,
  setActionType: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
};
