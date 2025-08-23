const express = require('express');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes below require auth
router.use(auth);

// List games for current user
router.get('/', async (req, res) => {
  try {
    const games = await Game.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json(games);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Create a new saved game
router.post('/', async (req, res) => {
  try {
    const { name, pgn, notes } = req.body;
    if (!pgn) return res.status(400).json({ error: 'PGN is required' });
    const game = await Game.create({ user: req.user.id, name, pgn, notes });
    res.status(201).json(game);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Update an existing game (name, pgn, notes)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pgn, notes } = req.body;
    const game = await Game.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: { ...(name !== undefined && { name }), ...(pgn !== undefined && { pgn }), ...(notes !== undefined && { notes }) } },
      { new: true }
    );
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete a game
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Game.deleteOne({ _id: id, user: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Game not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

module.exports = router;
