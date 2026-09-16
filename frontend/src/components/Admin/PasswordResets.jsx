import React, { useState } from 'react';
import { Check, X, Copy, KeyRound } from 'lucide-react';
import { approvePasswordResetApi, denyPasswordResetApi } from '../../api/api';

const STATUS_LABELS = {
  pending: 'Awaiting Approval',
  issued: 'Code Issued',
  used: 'Password Changed',
  denied: 'Denied'
};

const STATUS_PILL = { pending: 'pending', issued: 'pending', used: 'approved', denied: 'rejected' };

export default function PasswordResets({ requests, loading, fetchError, onRefresh, onRequestChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);

  const pending = requests.filter(r => r.status === 'pending');
  const ordered = [...requests].sort((a, b) => {
    const rank = { pending: 0, issued: 1, used: 2, denied: 3 };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
  });

  const act = async (request, action) => {
    setBusyId(request.id);
    setActionError('');
    try {
      if (action === 'approve') {
        const data = await approvePasswordResetApi(request.id);
        onRequestChanged(data.request);
        setIssued({ request: data.request, code: data.code });
        setCopied(false);
      } else {
        const data = await denyPasswordResetApi(request.id);
        onRequestChanged(data.request);
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="admin-title">Password Reset Requests</h2>
        <button onClick={onRefresh} className="btn btn-secondary admin-refresh-btn" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="instruction-box">
        <strong>How this works:</strong> A candidate who forgot their password sends a request here.
        Approving it creates a one-time code, shown to you only once. Give that code to the candidate
        (in person, by phone or by email) and they use it to set a new password.
      </div>

      {(fetchError || actionError) && <p className="error-message">{fetchError || actionError}</p>}

      <div className="card admin-table-card">
        {loading && requests.length === 0 ? (
          <p className="admin-empty">Loading requests...</p>
        ) : ordered.length === 0 ? (
          <p className="admin-empty">No password reset requests.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map(r => {
                  const busy = busyId === r.id;
                  const open = r.status === 'pending' || r.status === 'issued';
                  return (
                    <tr key={r.id}>
                      <td className="admin-name">{r.fullName}</td>
                      <td>@{r.username}</td>
                      <td>{r.email}</td>
                      <td>{r.requestedAt}</td>
                      <td><span className={`status-pill ${STATUS_PILL[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                      <td>
                        <div className="row-actions">
                          {open && (
                            <button type="button" className="icon-btn approve" disabled={busy} onClick={() => act(r, 'approve')}>
                              <Check size={15} aria-hidden="true" /> {r.status === 'issued' ? 'New Code' : 'Approve'}
                            </button>
                          )}
                          {open && (
                            <button type="button" className="icon-btn reject" disabled={busy} onClick={() => act(r, 'deny')}>
                              <X size={15} aria-hidden="true" /> Deny
                            </button>
                          )}
                          {!open && <span className="admin-muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-record-count">{pending.length} awaiting approval · {requests.length} total</p>
      </div>

      {issued && (
        <div className="review-modal-overlay" onClick={() => setIssued(null)}>
          <div className="confirm-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon code"><KeyRound size={24} aria-hidden="true" /></div>
            <h3>Reset Code for {issued.request.fullName}</h3>
            <p className="confirm-message">
              Give this code to the candidate now. It is shown only once and works for one password change.
            </p>
            <div className="reset-code">{issued.code}</div>
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={copyCode}>
                <Copy size={16} aria-hidden="true" /> {copied ? 'Copied' : 'Copy Code'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setIssued(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
