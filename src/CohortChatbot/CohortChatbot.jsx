import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../gen3-ui-component/components/Button'; // Assuming Button component is available
import './CohortChatbot.css';

// Placeholder function - replace with actual token retrieval logic in data-portal
const getTokenFromSomeplace = () => {
  // Example: retrieve from local storage or Redux state
  // return localStorage.getItem('gen3_token'); 
  console.warn("Using placeholder token for CohortChatbot. Replace getTokenFromSomeplace().");
  return "placeholder_token"; // Replace this
};

const CohortChatbot = ({ chatbotApiUrl = '/cohort-chatbot/query' }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    const authToken = getTokenFromSomeplace();
    if (!authToken) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(chatbotApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle HTTP errors (like 500, 502 from the backend)
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      
      // Handle errors returned within a successful response (e.g., LLM errors)
      if (data.error) {
          throw new Error(data.error);
      }

      setResult(data);

    } catch (err) {
      console.error("Chatbot query error:", err);
      setError(err.message || "An error occurred while processing your query.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cohort-chatbot">
      <h2>Cohort Query Chatbot</h2>
      <p>Describe the patient cohort you want to query using natural language.</p>
      
      <form onSubmit={handleSubmit} className="cohort-chatbot__form">
        <textarea
          value={query}
          onChange={handleQueryChange}
          placeholder="e.g., Show me subjects under 10 years old with ALL diagnosis"
          rows="4"
          className="cohort-chatbot__input"
          disabled={isLoading}
        />
        <Button
          type="submit"
          label={isLoading ? "Processing..." : "Submit Query"}
          buttonType="primary"
          disabled={isLoading || !query.trim()}
          className="cohort-chatbot__submit-button"
        />
      </form>

      {isLoading && <div className="cohort-chatbot__loading">Loading...</div>}

      {error && <div className="cohort-chatbot__error">Error: {error}</div>}

      {result && (
        <div className="cohort-chatbot__results">
          <h3>Results</h3>
          
          <div className="cohort-chatbot__generated-query">
            <h4>Generated Query:</h4>
            <pre><code>{result.generated_query}</code></pre>
            {result.variables && (
                <>
                    <h4>Variables:</h4>
                    <pre><code>{JSON.stringify(result.variables, null, 2)}</code></pre>
                </>
            )}
          </div>

          <div className="cohort-chatbot__data">
            <h4>Data:</h4>
            {/* Basic display - needs refinement based on actual data structure */}
            <pre><code>{JSON.stringify(result.results, null, 2)}</code></pre> 
          </div>
        </div>
      )}
    </div>
  );
};

CohortChatbot.propTypes = {
  chatbotApiUrl: PropTypes.string,
};

export default CohortChatbot; 