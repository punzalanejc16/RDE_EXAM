import React, { useState } from 'react';
import { Check, X, Trash2, RotateCcw } from 'lucide-react';
import { approveUserApi, rejectUserApi, deleteUserApi } from '../../api/api';
import ConfirmDialog from '../ConfirmDialog';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' }
];

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export default function UserApprovals({ users, loading, fetchError, onRefresh, onUserChanged, onUserDeleted }) {
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const counts = users.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});
  const visible = filter === 'all' ? users : users.filter(u => u.status === filter);

  const runAction = async (user, action) => {
    setBusyId(user.id);
    setActionError('');
    try {
      const data = action === 'approve' ? await approveUserApi(user.id) : await rejectUserApi(user.id);
      onUserChanged(data.user);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(pendingDelete.id);
    setDeleteError('');
    try {
      await deleteUserApi(pendingDelete.id);
      onUserDeleted(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const closeDialog = () => {
    setPendingDelete(null);
    setDeleteError('');
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="admin-title">Account Registrations</h2>
        <button onClick={onRefresh} className="btn btn-secondary admin-refresh-btn" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card pending"><span className="stat-value">{counts.pending || 0}</span><span className="stat-label">Pending</span></div>
        <div className="stat-card approved"><span className="stat-value">{counts.approved || 0}</span><span className="stat-label">Approved</span></div>
        <div className="stat-card rejected"><span className="stat-value">{counts.rejected || 0}</span><span className="stat-label">Rejected</span></div>
      </div>

      {(fetchError || actionError) && <p className="error-message">{fetchError || actionError}</p>}

      <div className="card admin-table-card">
        <div className="filter-chips">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="filter-chip-count">{f.key === 'all' ? users.length : counts[f.key] || 0}</span>
            </button>
          ))}
        </div>

        {loading && users.length === 0 ? (
          <p className="admin-empty">Loading accounts...</p>
        ) : visible.length === 0 ? (
          <p className="admin-empty">
            {filter === 'pending' ? 'No pending registrations. You\'re all caught up!' : 'No accounts found.'}
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(u => {
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td className="admin-name">{u.fullName}</td>
                      <td>@{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.createdAt}</td>
                      <td><span className={`status-pill ${u.status}`}>{STATUS_LABELS[u.status]}</span></td>
                      <td>
                        <div className="row-actions">
                          {u.status !== 'approved' && (
                            <button type="button" className="icon-btn approve" disabled={busy} onClick={() => runAction(u, 'approve')} title="Approve">
                              {u.status === 'rejected' ? <RotateCcw size={15} /> : <Check size={15} />}
                              {u.status === 'rejected' ? 'Re-approve' : 'Approve'}
                            </button>
                          )}
                          {u.status !== 'rejected' && (
                            <button type="button" className="icon-btn reject" disabled={busy} onClick={() => runAction(u, 'reject')} title={u.status === 'approved' ? 'Revoke access' : 'Reject'}>
                              <X size={15} /> {u.status === 'approved' ? 'Revoke' : 'Reject'}
                            </button>
                          )}
                          <button type="button" className="icon-btn delete" disabled={busy} onClick={() => setPendingDelete(u)} title="Delete account" aria-label="Delete account">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-record-count">Showing {visible.length} of {users.length} accounts</p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete Account?"
        message="Are you sure you want to delete this account? The candidate will no longer be able to sign in. Their past submissions are kept."
        details={pendingDelete && (
          <>
            <strong>{pendingDelete.fullName}</strong>
            <span>@{pendingDelete.username} · {pendingDelete.email}</span>
          </>
        )}
        confirmLabel="Delete Account"
        busy={busyId === pendingDelete?.id}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      />
    </div>
  );
}
