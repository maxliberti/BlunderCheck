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
app.use(cors());
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