// setup

require('dotenv').config();

// Verify environment variable
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env file');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env file');
}

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const passport = require('passport');
const configurePassport = require('./config/passport');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// In development, accept requests from any origin (useful for localhost/127.0.0.1 variants).
// In production, set FRONTEND_URL to your exact domain and tighten this.
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl (no origin) and any browser origin in dev
    if (!origin) return callback(null, true);
    // If you want to restrict in dev to a list, use an array check here.
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());
configurePassport();

// db
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

async function connect_to_db() {
    try {
        await mongoose.connect(uri)
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log(error);
    }
}

connect_to_db();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(8080, () => {
    console.log("Server started on port 8080");
});