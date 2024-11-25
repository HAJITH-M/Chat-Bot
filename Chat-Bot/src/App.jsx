import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [message, setMessage] = useState(''); // URL to scrape
  const [response, setResponse] = useState(''); // Response to display from server
  const [loading, setLoading] = useState(false); // Show loading state
  const [error, setError] = useState(''); // For handling errors

  // Send the URL to the backend server for scraping
  const handleSendMessage = async () => {
    if (!message) {
      setError('Please enter a valid URL');
      return; // Prevent request if the URL is empty
    }
  
    setError(''); // Clear any previous errors
    setLoading(true); // Show loading indicator
    console.log('Sending request with URL:', message); // Log the URL being sent
  
    try {
      // Send URL to backend for scraping
      const res = await axios.post('http://localhost:5000/scrape', {
        url: message,
      });
  
      console.log('Received response:', res.data);  // Log the response from the server
      setResponse(res.data.content.join('\n')); // Display the scraped content
    } catch (error) {
      console.error('Error during API call:', error); // Log any errors
      if (error.response) {
        console.error('Error response:', error.response.data);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      setError('Error while scraping. Please try again later.');
      setResponse(''); // Clear the previous response if there's an error
    } finally {
      setLoading(false); // Hide loading indicator
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

      {/* Display scraped content or an error message */}
      <div>
        <p>Response:</p>
        <pre>{response}</pre>
      </div>
    </div>
  );
};

export default App;
