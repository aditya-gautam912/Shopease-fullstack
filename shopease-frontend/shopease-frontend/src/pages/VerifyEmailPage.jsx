/**
 * src/pages/VerifyEmailPage.jsx
 * Email verification page - handles token verification from email link
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/authService';
import { updateUser } from '../redux/slices/authSlice';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const result = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(result.message || 'Email verified successfully!');
        
        // Update user in Redux if logged in
        if (result.data?.user) {
          dispatch(updateUser(result.data.user));
        }

        // Redirect after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may be invalid or expired.');
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link.');
    }
  }, [token, navigate, dispatch]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' && (
          <div className="card p-8 sm:p-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FiLoader className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying Your Email
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="card p-8 sm:p-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FiCheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Verified! 🎉
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Redirecting to homepage in 3 seconds...
            </p>
            <Link to="/" className="btn-primary py-2.5 px-6 inline-block">
              Go to Homepage
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="card p-8 sm:p-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FiXCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login" className="btn-secondary py-2.5 px-6">
                Go to Login
              </Link>
              <Link to="/profile" className="btn-primary py-2.5 px-6">
                Resend Verification
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
