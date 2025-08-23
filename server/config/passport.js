const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

function configurePassport() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !OAUTH_CALLBACK_URL) {
    console.warn('Google OAuth environment variables are not fully set. OAuth routes will not work until configured.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: OAUTH_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const provider = 'google';
          const providerId = profile.id;
          const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : undefined;
          const name = profile.displayName;
          const avatar = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : undefined;

          let user = await User.findOne({ provider, providerId });
          if (!user) {
            // Try to link by email if exists
            if (email) {
              user = await User.findOne({ email });
            }
            if (user) {
              user.provider = provider;
              user.providerId = providerId;
              user.avatar = avatar || user.avatar;
              user.name = user.name || name;
              await user.save();
            } else {
              user = await User.create({ provider, providerId, email, name, avatar });
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

module.exports = configurePassport;
