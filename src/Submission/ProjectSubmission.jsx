import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import checkProjectPermission from '../hooks/checkProjectPermission';
import ReduxDataModelGraph from '../DataModelGraph/ReduxDataModelGraph';
import ReduxSubmitForm from './ReduxSubmitForm';
import ReduxSubmitTSV from './ReduxSubmitTSV';
import Spinner from '../components/Spinner';
import './ProjectSubmission.css';

/**
 * @param {Object} props
 * @param {Object} [props.dictionary]
 * @param {(project: string) => void} props.onGetCounts
 * @param {boolean} [props.dataIsReady]
 */
function ProjectSubmission({ dictionary, onGetCounts, dataIsReady = false }) {
  if (dictionary === undefined) return <Spinner />;

  const { project } = useParams();
  // hack to detect if dictionary data is available, and to trigger fetch if not
  if (!dataIsReady) onGetCounts(project);

  const navigate = useNavigate();
  const isUserWithPermission = checkProjectPermission(project);
  useEffect(() => {
    if (!isUserWithPermission) navigate(-1);
  }, []);

  return (
    <div className='project-submission'>
      <h2 className='project-submission__title'>{project}</h2>
      <Link className='project-submission__link' to='search'>
        browse nodes
      </Link>
      <ReduxSubmitForm />
      <ReduxSubmitTSV project={project} />
      {dataIsReady ? (
        <ReduxDataModelGraph />
      ) : (
        project !== '_root' && <Spinner />
      )}
    </div>
  );
}

ProjectSubmission.propTypes = {
  dictionary: PropTypes.object,
  onGetCounts: PropTypes.func.isRequired,
  dataIsReady: PropTypes.bool,
};

export default ProjectSubmission;
