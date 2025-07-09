import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch } from '../redux/hooks';
import { updateProjectApprovedUrl } from '../redux/dataRequest/asyncThunks';
import SimpleInputField from '../components/SimpleInputField';
import Button from '../gen3-ui-component/components/Button';
import { useEffect, useState } from 'react';
import { fetchWithCreds } from '../utils.fetch.js';
import Spinner from '../gen3-ui-component/components/Spinner/Spinner';
const updateUrlSchema = Yup.object().shape({
  approved_url: Yup.string().url().required('Must be a valid URL'),
});

export default function DataRequestApprovedUrl({
  projectId,
  setActionType,
  errorObjectForField,
  onAction,
}) {
  const dispatch = useAppDispatch();
  const [approvedUrl, setApprovedUrl] = useState('');
  const [isActionPending, setActionPending] = useState(false);
  const [actionRequestError, setRequestactionError] = useState({
    isError: false,
    message: '',
  });
  useEffect(() => {
    if (!projectId) return;
    setApprovedUrl('');
    const fetchUrl = async () => {
      try {
        setActionPending(true);
        const result = await fetchWithCreds({
          path: `/amanuensis/admin/project/approved-url/${projectId}`,
          method: 'GET',
        });
        if (result.data && result.data.approved_url) {
          setApprovedUrl(result.data.approved_url);
        }
      } catch {
        setApprovedUrl('');
      } finally {
        setActionPending(false);
      }
    };
    fetchUrl();
  }, [projectId]);
  return (
    <Formik
      validationSchema={updateUrlSchema}
      initialValues={{
        approved_url: '',
      }}
      onSubmit={({ approved_url }) => {
        setActionPending(true);
        const actionRequest =
          /** @type {import("../redux/dataRequest/types").Request} */
          (
            dispatch(
              updateProjectApprovedUrl({
                approved_url,
                project_id: projectId,
              }),
            )
          );

        actionRequest.then((action) => {
          setActionPending(false);
          if (!action.payload.isError) {
            onAction?.('SUCCESSFUL_APPROVED_URL_CHANGE');
            setActionType('ACTION_SUCCESS');
            return;
          }

          const { isError, message } = action.payload;
          setRequestactionError({ isError, message });
        });
      }}
    >
      {({ errors, touched }) => (
        <Form className='data-request__form'>
          <div className='data-request__header'>
            <h2>Update Approved Data URL</h2>
          </div>

          {isActionPending ? (
            <Spinner />
          ) : (
            <div
              className={`data-request__approved-url ${
                approvedUrl
                  ? 'data-request__approved-url--has-url'
                  : 'data-request__approved-url--no-url'
              }`}
            >
              {approvedUrl ? (
                <span>Current Approved URL: {approvedUrl}</span>
              ) : (
                <span>No current approved URL</span>
              )}
            </div>
          )}
          <div className='data-request__fields'>
            <Field name='approved_url'>
              {({ field }) => (
                <SimpleInputField
                  className='data-request__value-container'
                  label='Approved Data URL'
                  input={<input type='text' {...field} />}
                  error={errorObjectForField(errors, touched, 'approved_url')}
                />
              )}
            </Field>
          </div>

          <Button submit className='data-request__submit' label='Submit' />
          {actionRequestError.isError && (
            <span className='data-request__request-error'>
              {actionRequestError.message}
            </span>
          )}
        </Form>
      )}
    </Formik>
  );
}
