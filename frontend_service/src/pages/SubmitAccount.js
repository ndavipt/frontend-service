import React, { useState } from 'react';
import { Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { submitAccount } from '../services/api';

function SubmitAccount() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username || username.trim() === '') {
      setError('Please enter a valid Instagram username');
      return;
    }
    
    // Remove @ symbol if present
    const cleanUsername = username.trim().replace(/^@/, '');
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const result = await submitAccount(cleanUsername);
      
      setSuccess(true);
      setUsername('');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit account. Please try again later.');
      setLoading(false);
      console.error('Error submitting account:', err);
    }
  };

  return (
    <div className="submit-form">
      <h1 className="mb-4">Submit an Account</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <p>
            Use this form to submit an Instagram account to be tracked on the leaderboard.
            All submissions will be reviewed before being added to the tracking list.
          </p>
          <p className="mb-0">
            <strong>Guidelines:</strong>
          </p>
          <ul>
            <li>Account must be a public Instagram profile</li>
            <li>Account should be related to AI-generated content</li>
            <li>No spam or inappropriate content</li>
          </ul>
        </Card.Body>
      </Card>
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
          Account submitted successfully! It will be reviewed soon.
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formUsername">
          <Form.Label>Instagram Username</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter Instagram username (e.g. ai_companion_nora)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <Form.Text className="text-muted">
            Enter the username without the @ symbol
          </Form.Text>
        </Form.Group>
        
        <Button 
          variant="primary" 
          type="submit"
          disabled={loading || !username.trim()}
        >
          {loading ? <><Spinner size="sm" animation="border" /> Submitting...</> : 'Submit Account'}
        </Button>
      </Form>
    </div>
  );
}

export default SubmitAccount;