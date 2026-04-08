/**
 * src/redux/slices/uiSlice.js
 * Manages global UI state: dark mode toggle and mobile menu visibility.
 */

import { createSlice } from '@reduxjs/toolkit';

const prefersDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
const storedTheme  = localStorage.getItem('se_theme');
const isDark       = storedTheme ? storedTheme === 'dark' : prefersDark;

// Apply theme class to <html> on boot
if (isDark) document.documentElement.classList.add('dark');
else        document.documentElement.classList.remove('dark');

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode:       isDark,
    mobileMenuOpen: false,
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('se_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('se_theme', 'light');
      }
    },
    setMobileMenu(state, action) {
      state.mobileMenuOpen = action.payload;
    },
  },
});

export const { toggleDarkMode, setMobileMenu } = uiSlice.actions;
export const selectDarkMode      = (state) => state.ui.darkMode;
export const selectMobileMenuOpen = (state) => state.ui.mobileMenuOpen;

export default uiSlice.reducer;