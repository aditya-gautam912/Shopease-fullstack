/**
 * src/hooks/useAuth.js
 * Custom hook for accessing authentication state from Redux.
 */

import { useSelector } from 'react-redux';
import {
  selectCurrentUser,
  selectToken,
  selectRefreshToken,
  selectIsLoggedIn,
  selectIsAdmin,
  selectAuthLoading,
} from '../redux/slices/authSlice';

export const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);
  const refreshToken = useSelector(selectRefreshToken);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAdmin = useSelector(selectIsAdmin);
  const loading = useSelector(selectAuthLoading);

  return {
    user,
    token,
    refreshToken,
    isLoggedIn,
    isAdmin,
    loading,
  };
};
