import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [message, setMessage] = useState('');  // URL to scrape
  const [response, setResponse] = useState('');  // Response from the server
  const [loading, setLoading] = useState(false);  // Loading state
  const [error, setError] = useState('');  // Error message state

  const handleSendMessage = async () => {
    if (!message) {
      setError('Please enter a valid URL');
      return;
    }
  
    setError('');
    setLoading(true);
    console.log('Sending request with URL:', message);
  
    try {
      const res = await axios.post('http://localhost:5000/scrape', { url: message });
      console.log('Received response:', res.data);
  
      if (res.data && Array.isArray(res.data.content)) {
        setResponse(res.data.content.length ? res.data.content.join('\n') : 'No content found.');
      } else {
        setResponse('Error: Invalid response format.');
      }
    } catch (error) {
      console.error('Error during API call:', error);
      setError('Error while scraping. Please try again later.');
      setResponse('');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="App">
      <h1>Web Scraping Chatbot</h1>
      
      <div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter URL to scrape"
        />
        <button onClick={handleSendMessage} disabled={loading}>
          {loading ? 'Scraping...' : 'Scrape'}
        </button>
      </div>

      {/* Error Handling */}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Display Scraped Content */}
      <div>
        <p>Response:</p>
        <pre>{response}</pre>
      </div>
    </div>
  );
};

export default App;
