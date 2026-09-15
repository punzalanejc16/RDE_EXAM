import React from 'react';
import { LogOut } from 'lucide-react';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
}

export default function SessionBar({ user, onLogout }) {
  const isAdmin = user.role === 'admin';
  return (
    <div className="session-bar">
      <div className="session-user">
        <span className={`session-avatar ${isAdmin ? 'admin' : ''}`}>{initials(user.fullName)}</span>
        <div className="session-meta">
          <span className="session-name">{user.fullName}</span>
          <span className="session-sub">@{user.username} · {isAdmin ? 'Administrator' : 'Candidate'}</span>
        </div>
      </div>
      <button type="button" className="btn btn-ghost" onClick={onLogout}>
        <LogOut size={16} aria-hidden="true" /> Sign Out
      </button>
    </div>
  );
}
