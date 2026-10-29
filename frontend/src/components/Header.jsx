import React from 'react';
import { ShieldCheck, Server, RefreshCw, User, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ isServerOnline, isCheckingServer, onCheckServer }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand */}
        <div className="header-brand">
          <div className="brand-logo-glow">
            <ShieldCheck className="brand-icon" size={26} />
          </div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title">TaskFlow Auth</h1>
            </div>
            <p className="brand-subtitle">
              Containerized Full-Stack Task Management (Docker & Compose)
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="header-actions">
          {/* Server status pill */}
          <div className={`server-status-pill ${isServerOnline ? 'online' : 'offline'}`}>
            <span className="pulse-dot"></span>
            <Server size={14} />
            <span>{isServerOnline ? 'Backend Connected' : 'Server Offline'}</span>
            <button
              className={`btn-icon-refresh ${isCheckingServer ? 'spinning' : ''}`}
              onClick={onCheckServer}
              title="Ping Backend API"
              aria-label="Refresh server status"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* User Profile & Logout if authenticated */}
          {isAuthenticated && user && (
            <div className="user-profile-badge">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button
                className="btn-logout"
                onClick={() => logout()}
                title="Log out and clear JWT token"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="auth-locked-pill">
              <Lock size={13} />
              <span>JWT Protected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
