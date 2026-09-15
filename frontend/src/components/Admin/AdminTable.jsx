import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteResultApi } from '../../api/api';
import ConfirmDialog from '../ConfirmDialog';

export default function AdminTable({ adminResults, adminLoading, adminFetchError, fetchAdminResults, setReviewCandidate, onResultDeleted }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const closeDialog = () => {
    setPendingDelete(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteResultApi(pendingDelete.id);
      onResultDeleted(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

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
                  <th>Attempt</th>
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
                  <tr key={r.id || i}>
                    <td>{i + 1}</td>
                    <td className="admin-name">{r.studentName}</td>
                    <td>{r.attemptNumber ? `#${r.attemptNumber}` : '—'}</td>
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
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary admin-review-btn"
                          onClick={() => setReviewCandidate(r)}
                        >
                          Review Exam
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setPendingDelete(r)}
                          disabled={!r.id}
                          title="Delete submission"
                        >
                          <Trash2 size={15} aria-hidden="true" /> Delete
                        </button>
                      </div>
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete Submission?"
        message="Are you sure you want to delete this submission? This action cannot be undone."
        details={pendingDelete && (
          <>
            <strong>{pendingDelete.studentName}</strong>
            {pendingDelete.attemptNumber ? ` · Attempt #${pendingDelete.attemptNumber}` : ''}
            <span>{pendingDelete.score} / {pendingDelete.total} ({pendingDelete.percentage}%) · {pendingDelete.status}</span>
            <span>{pendingDelete.timestamp}</span>
          </>
        )}
        confirmLabel="Delete Submission"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      />
    </div>
  );
}
