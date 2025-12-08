import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// AWS API Gateway Base URL
const API_BASE = 'https://ctgxhoqv18.execute-api.us-east-1.amazonaws.com';

// Backend endpoints
const UPLOAD_URL = `${API_BASE}/upload`;
const PROCESS_URL = `${API_BASE}/process`;
const STATUS_URL = `${API_BASE}/status`;
const CLEANUP_URL = `${API_BASE}/cleanup`;


// --- API FUNCTIONS ---

/**
 * Step 1: Request a signed URL from the Lambda function.
 * @param {string} filename - The name of the file to be uploaded.
 * @param {string} fileType - The MIME type of the file (e.g., 'audio/mp3').
 * @returns {Promise<{sessionId: string, uploadUrl: string, s3Key: string}>}
 */
async function getUploadUrl(filename, fileType) {
    // Send both filename AND fileType to the Lambda
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: filename, fileType: fileType }) // <-- CRITICAL: Include fileType
    });
    if (!res.ok) throw new Error('Failed to get upload URL');
    return res.json(); // { sessionId, uploadUrl, s3Key }
}

/**
 * Step 2: Upload the file directly to S3 using the signed URL.
 * @param {string} uploadUrl - The pre-signed URL for the S3 PUT operation.
 * @param {File} file - The file object from the input.
 */
async function uploadToS3(uploadUrl, file) {
    // CRITICAL: The Content-Type header MUST exactly match the one used to sign the URL (file.type)
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type }, 
      body: file
    });
    if (!res.ok) throw new Error(`S3 upload failed with status ${res.status}`);
}

/**
 * Step 3: Start the Demucs processing job.
 * @param {string} s3Key - The key of the uploaded file in S3.
 * @param {string} sessionId - The unique session ID.
 */
async function startProcessing(s3Key, sessionId) {
    const res = await fetch(PROCESS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            s3Key: s3Key,
            sessionId: sessionId
        })
    });
    if (!res.ok) throw new Error('Failed to start processing job');
}

/**
 * Step 4: Check the status of the job.
 * @param {string} sessionId - The unique session ID.
 * @returns {Promise<object>} The status response object.
 */
async function checkStatus(sessionId) {
    const res = await fetch(STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
    if (!res.ok) throw new Error('Failed to check status');
    return res.json(); // Just return the response directly, no transformation needed
}

// --- REACT COMPONENT ---

function App() {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [s3Key, setS3Key] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  // Animation CSS injection
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes progress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setMessage('');
    setFiles([]);
  };

  const pollStatus = useCallback(async (currentSessionId) => {
    let statusResponse;
    try {
        statusResponse = await checkStatus(currentSessionId);

        if (statusResponse.status === 'COMPLETED') {
            clearInterval(window.statusInterval);
            setIsProcessing(false);
            setFiles(statusResponse.output_files);
            setMessage('Processing complete! Download your tracks below.');
        } else if (statusResponse.status === 'FAILED') {
            clearInterval(window.statusInterval);
            setIsProcessing(false);
            setError(`Job failed: ${statusResponse.error_message || 'Check logs for details.'}`);
        } else {
            setMessage(`Status: ${statusResponse.status}. Waiting...`);
        }
    } catch (e) {
        clearInterval(window.statusInterval);
        setIsProcessing(false);
        setError(`Status check failed: ${e.message}`);
    }
}, []);

  const handleSubmit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setFiles([]);
    setError(null);
    setMessage('1/4. Requesting upload URL...');

    try {
      // 1. Get presigned URL
      // CRITICAL CHANGE: Pass file.type along with file.name
      const uploadData = await getUploadUrl(file.name, file.type);
      setSessionId(uploadData.sessionId);
      setS3Key(uploadData.s3Key);

      setMessage('2/4. Uploading file to S3...');
      
      // 2. Upload to S3
      await uploadToS3(uploadData.uploadUrl, file);

      setMessage('3/4. Starting processing job...');
      
      // 3. Start processing
      await startProcessing(uploadData.s3Key, uploadData.sessionId);

      setMessage('4/4. Job started. Checking status...');

      // 4. Start polling for status
      if (window.statusInterval) clearInterval(window.statusInterval);
      window.statusInterval = setInterval(() => pollStatus(uploadData.sessionId), 5000);

    } catch (e) {
      console.error(e);
      setError(`Operation failed: ${e.message}`);
      setIsProcessing(false);
      if (window.statusInterval) clearInterval(window.statusInterval);
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
        if (window.statusInterval) clearInterval(window.statusInterval);
    };
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Demucs Audio Separator</h1>
      <p style={styles.subtitle}>Upload an audio file to separate vocals and instrumental tracks.</p>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={styles.fileInput}
        disabled={isProcessing}
      />

      <button
        onClick={handleSubmit}
        style={{ ...styles.button, ...(isProcessing || !file ? styles.buttonDisabled : {}) }}
        disabled={isProcessing || !file}
      >
        {isProcessing ? 'Processing...' : 'Separate Tracks'}
      </button>

      {/* Status & Progress */}
      {(isProcessing || error || message) && (
        <div style={styles.statusBox}>
          {error && <p style={styles.errorText}>Error: {error}</p>}
          {message && !error && <p style={styles.messageText}>{message}</p>}
          
          {isProcessing && (
            <>
              <p style={styles.warningText}>⏱️ Audio separation may take up to 15 minutes. Don't refresh or close the window!</p>
              <div style={styles.progressBarContainer}>
                <div style={styles.progressBar}></div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {files.length > 0 && (
        <div style={styles.results}>
          <h2 style={styles.resultsTitle}>Download Separated Tracks</h2>
          {files.map((file, index) => (
            <a key={index} href={file.s3_url} download style={styles.downloadLink}>
              {file.type}
            </a>
          ))}
          <p style={styles.noteText}>Files will be deleted after refresh.</p>
        </div>
      )}
    </div>
  );
}

// Simple internal styling for aesthetics
const styles = {
  container: {
    textAlign: 'center',
    padding: '40px 20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#1a1a2e', // Dark background
    color: 'white',
    fontFamily: 'Inter, sans-serif'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    background: 'linear-gradient(to right, #764ba2, #667eea)',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#ccc',
    marginBottom: '30px',
  },
  fileInput: {
    padding: '10px',
    margin: '20px 0',
    fontSize: '1rem',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #444',
    borderRadius: '8px',
    backgroundColor: '#2a2a44',
    color: 'white',
    cursor: 'pointer',
  },
  button: {
    padding: '12px 25px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.3s ease, transform 0.1s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
  },
  buttonDisabled: {
    backgroundColor: '#4a4a6b',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  statusBox: {
    marginTop: '25px',
    padding: '15px',
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#2a2a44',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  messageText: {
    color: '#90ee90',
    marginBottom: '10px',
    fontWeight: '500',
  },
  errorText: {
    color: '#ff6347',
    marginBottom: '10px',
    fontWeight: '500',
  },
  warningText: {
    color: '#edf7f6',
    marginBottom: '10px',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  progressBarContainer: {
    marginTop: '15px',
    width: '100%',
    height: '10px',
    backgroundColor: '#3a3a5a',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #764ba2, #667eea)',
    animation: 'progress 1.5s linear infinite',
  },
  results: {
    marginTop: '30px',
    width: '100%',
    maxWidth: '400px',
    padding: '20px',
    backgroundColor: '#2a2a44',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  resultsTitle: {
    fontSize: '1.4rem',
    color: '#fff',
    marginBottom: '15px',
    borderBottom: '1px solid #4a4a6b',
    paddingBottom: '10px'
  },
  downloadLink: {
    display: 'block',
    padding: '10px',
    margin: '10px 0',
    backgroundColor: '#3a3a5a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '5px',
    transition: 'background-color 0.2s ease',
  },
  noteText: {
      fontSize: '0.8rem',
      color: '#aaa',
      marginTop: '15px'
  }
};

export default App;