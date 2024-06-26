import { connect } from 'react-redux';
import CoreMetadataHeader from './CoreMetadataHeader';
import FileTypePicture from '../components/FileTypePicture';
import CoreMetadataTable from './CoreMetadataTable';
import { coreMetadataPath, userapiPath } from '../localconf';
import { updatePopup } from '../redux/popups/slice';
import { requestErrored } from '../redux/status/slice';
import { fetchWithCreds } from '../utils.fetch';

export const generateSignedURL = (objectId) => (dispatch) =>
  fetchWithCreds({
    path: `${userapiPath}/data/download/${objectId}?expires_in=3600`,
    onError: () => dispatch(requestErrored()),
  }).then(({ status, data }) => {
    switch (status) {
      case 200:
        dispatch({
          type: 'RECEIVE_SIGNED_URL',
          url: data.url,
        });
        return dispatch(updatePopup({ signedURLPopup: true }));
      default:
        dispatch({
          type: 'SIGNED_URL_ERROR',
          error: `Error occurred during generating signed URL. Error code: ${status}`,
        });
        return dispatch(updatePopup({ signedURLPopup: true }));
    }
  });

const clearSignedURL = () => ({
  type: 'CLEAR_SIGNED_URL',
});

export const fetchCoreMetadata = (objectId) => (dispatch) =>
  fetchWithCreds({
    path: coreMetadataPath + objectId,
    customHeaders: { Accept: 'application/json' },
    onError: () => dispatch(requestErrored()),
  })
    .then(({ status, data }) => {
      switch (status) {
        case 200:
          return {
            type: 'RECEIVE_CORE_METADATA',
            metadata: data,
          };
        default:
          return {
            type: 'CORE_METADATA_ERROR',
            error: data,
          };
      }
    })
    .then((msg) => dispatch(msg));

export const ReduxCoreMetadataHeader = (() => {
  const mapStateToProps = (state) => ({
    metadata: state.coreMetadata.metadata,
    signedURL: state.coreMetadata.url,
    signedURLPopup: state.popups.signedURLPopup,
    error: state.coreMetadata.error,
    projectAvail: state.project.projectAvail,
  });

  const mapDispatchToProps = (dispatch) => ({
    onGenerateSignedURL: (objectId) => dispatch(generateSignedURL(objectId)),
    onUpdatePopup: (state) => dispatch(updatePopup(state)),
    onClearSignedURL: () => dispatch(clearSignedURL()),
  });

  return connect(mapStateToProps, mapDispatchToProps)(CoreMetadataHeader);
})();

export const ReduxFileTypePicture = (() => {
  const mapStateToProps = (state) => ({
    metadata: state.coreMetadata.metadata,
  });

  return connect(mapStateToProps)(FileTypePicture);
})();

export const ReduxCoreMetadataTable = (() => {
  const mapStateToProps = (state) => ({
    metadata: state.coreMetadata.metadata,
  });

  return connect(mapStateToProps)(CoreMetadataTable);
})();
