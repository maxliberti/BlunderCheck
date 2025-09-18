const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');

const router = express.Router();

// Register with name, username, email (optional), and password
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    // Check uniqueness for username and (if provided) email
    const existsUser = await User.findOne({ $or: [ { username: username?.toLowerCase() }, ...(email ? [{ email: email?.toLowerCase() }] : []) ] });
    if (existsUser) {
      const taken = existsUser.username?.toLowerCase() === username?.toLowerCase() ? 'Username' : 'Email';
      return res.status(409).json({ error: `${taken} already in use` });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, username: username?.toLowerCase(), email: email?.toLowerCase(), passwordHash });
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with identifier (username or email) and password
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() };
    const user = await User.findOne(query);
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth start
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontend}/auth/callback?token=${encodeURIComponent(token)}`;
      res.redirect(302, redirectUrl);
    } catch (e) {
      res.redirect(302, (process.env.FRONTEND_URL || 'http://localhost:5173') + '/auth/callback?error=oauth_failed');
    }
  }
);

router.get('/failure', (req, res) => {
  res.status(401).json({ error: 'Google authentication failed' });
});
// Google OAuth end

module.exports = router;
