import React from 'react';

export default function AdminTable({ adminResults, adminLoading, adminFetchError, fetchAdminResults, setReviewCandidate }) {
  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="admin-title">Candidate Submissions</h2>
        <button
          onClick={fetchAdminResults}
          className="btn btn-secondary admin-refresh-btn"
          disabled={adminLoading}
        >
          {adminLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {adminFetchError && <p className="error-message">{adminFetchError}</p>}

      <div className="card admin-table-card">
        {adminLoading && adminResults.length === 0 ? (
          <p className="admin-empty">Loading results...</p>
        ) : adminResults.length === 0 ? (
          <p className="admin-empty">No submissions found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate Full Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>Completion Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminResults.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="admin-name">{r.studentName}</td>
                    <td>{r.score} / {r.total}</td>
                    <td>{r.percentage}%</td>
                    <td>
                      <span className={`admin-status ${r.status === 'PASSED' ? 'passed' : 'failed'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.startTime || 'N/A'}</td>
                    <td>{r.timestamp}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary admin-review-btn"
                        onClick={() => setReviewCandidate(r)}
                      >
                        Review Exam
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-record-count">
          Total Records: {adminResults.length}
        </p>
      </div>
    </div>
  );
}