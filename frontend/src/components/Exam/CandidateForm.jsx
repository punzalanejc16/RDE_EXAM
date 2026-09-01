import React from 'react';

export default function CandidateForm({ candidateName, setCandidateName, handleStartExam, error }) {
  return (
    <div className="card compact-card">
      <div className="card-header">
        <h2>Candidate Verification</h2>
        <p className="greeting">Good luck on your examination!</p>
      </div>
      <form onSubmit={handleStartExam}>
        <div className="form-group">
          <label className="form-label">Candidate Full Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. John Doe"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Start Examination
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}