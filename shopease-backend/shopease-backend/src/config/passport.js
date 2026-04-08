/**
 * src/config/passport.js
 * Passport configuration for Google and Facebook OAuth strategies
 */

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = (passport) => {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name = profile.displayName;

          // Find user by email
          let user = await User.findOne({ email });

          if (user) {
            // User exists, link Google account if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
          } else {
            // Create new user
            user = await User.create({
              name,
              email,
              googleId: profile.id,
              password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Random password
            });
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
          );

          return done(null, { user, token });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Facebook OAuth Strategy
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (!email) {
            return done(new Error('Email not provided by Facebook'), null);
          }

          const name = profile.displayName;

          // Find user by email
          let user = await User.findOne({ email });

          if (user) {
            // User exists, link Facebook account if not already linked
            if (!user.facebookId) {
              user.facebookId = profile.id;
              await user.save();
            }
          } else {
            // Create new user
            user = await User.create({
              name,
              email,
              facebookId: profile.id,
              password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Random password
            });
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
          );

          return done(null, { user, token });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Serialize user (not used for JWT-based auth, but required by passport)
  passport.serializeUser((data, done) => {
    done(null, data);
  });

  // Deserialize user
  passport.deserializeUser((data, done) => {
    done(null, data);
  });
};
