import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { sendSignInLink } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage('');

    try {
      await sendSignInLink(email);
      setMessage('Check your email for the sign-in link!');
      setEmail('');
    } catch (error) {
      setMessage('Error sending sign-in link. Please try again.');
      console.error('Sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Sign In</h2>
        <p className="text-gray-600 mb-4">
          Enter your email to receive a sign-in link. No password required!
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            required
          />
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Sign-In Link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
        
        {message && (
          <p className={`mt-4 p-3 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export const AuthButton: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <>
      {!user ? (
        <button
          onClick={() => setShowSignInModal(true)}
          className="auth-signin-btn"
        >
          <svg className="auth-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="auth-text">Sign In</span>
        </button>
      ) : (
        <div className="user-profile-container" ref={userMenuRef}>
          <button
            className="user-profile-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user.email || 'User'}
          >
            <div className="user-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="user-avatar-img" />
              ) : (
                <span className="user-avatar-text">
                  {getUserInitials(user.email || 'U')}
                </span>
              )}
            </div>
            <span className="user-email">{user.email}</span>
            <svg className="user-menu-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="user-menu">
              <div className="user-menu-header">
                <div className="user-menu-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="user-menu-avatar-img" />
                  ) : (
                    <span className="user-menu-avatar-text">
                      {getUserInitials(user.email || 'U')}
                    </span>
                  )}
                </div>
                <div className="user-menu-info">
                  <div className="user-menu-email">{user.email}</div>
                  <div className="user-menu-status">Signed in</div>
                </div>
              </div>
              <div className="user-menu-actions">
                <button
                  onClick={handleSignOut}
                  className="user-menu-signout-btn"
                >
                  <svg className="signout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />
    </>
  );
};
