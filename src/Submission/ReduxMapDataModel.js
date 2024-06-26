import { connect } from 'react-redux';
import MapDataModel from './MapDataModel';

const ReduxMapDataModel = (() => {
  /** @param {import('../redux/types').RootState} state */
  const mapStateToProps = (state) => ({
    filesToMap: state.submission.filesToMap,
    projects: state.submission.projectsByName,
    nodeTypes: state.submission.nodeTypes,
    dictionary: state.submission.dictionary,
  });

  return connect(mapStateToProps)(MapDataModel);
})();

export default ReduxMapDataModel;
