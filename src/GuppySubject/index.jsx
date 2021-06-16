import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guppyGraphQLUrl, explorerConfig, headers } from '../localconf';

const { guppyConfig } = explorerConfig[0];
function fetchSubjectData(subjectId) {
  // query fields are chosen arbitrarily
  const query = `query ($filter: JSON) {
    ${guppyConfig.dataType} (filter: $filter) {
      consortium
      data_contributor_id
      ethnicity
      lkss
      race
      sex
      study_id
      tumor_classification
    }
  }`;
  return fetch(guppyGraphQLUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: {
        filter: { IN: { subject_submitter_id: [subjectId] } },
      },
    }),
  })
    .then((res) => res.json())
    .catch((err) => {
      throw new Error(`Error during fetching subject data ${err}`);
    });
}

function GuppySubject() {
  const params = useParams();
  const subjectId = params.id;

  const [subjectInfoText, setSubjectInfoText] = useState('Loading...');
  useEffect(() => {
    let isMounted = true;
    fetchSubjectData(subjectId).then(({ data }) => {
      if (isMounted)
        setSubjectInfoText(
          data.subject ? JSON.stringify(data.subject, null, 2) : 'error'
        );
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ paddingBottom: '10px' }}>Subject ID: {subjectId}</h2>
      <pre
        style={{
          background: 'var(--g3-color__white',
          border: 'none',
          padding: '10px 0',
        }}
      >
        {subjectInfoText}
      </pre>
    </div>
  );
}

export default GuppySubject;
