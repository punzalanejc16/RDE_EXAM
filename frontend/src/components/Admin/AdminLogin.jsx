import React from 'react';

export default function AdminLogin({ adminPassInput, setAdminPassInput, handleAdminLogin, adminPassError }) {
  return (
    <div className="card compact-card">
      <div className="card-header">
        <h2>Admin Authentication</h2>
        <p className="greeting">Enter the admin passphrase to view candidate results.</p>
      </div>
      <form onSubmit={handleAdminLogin}>
        <div className="form-group">
          <label className="form-label">Passphrase</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter admin passphrase"
            value={adminPassInput}
            onChange={(e) => setAdminPassInput(e.target.value)}
            required
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Authenticate
        </button>
      </form>
      {adminPassError && <p className="error-message">{adminPassError}</p>}
    </div>
  );
}