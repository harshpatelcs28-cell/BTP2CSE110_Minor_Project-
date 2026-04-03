const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../database');

const router = express.Router();

// GET /api/alerts — fetch alerts for logged-in user
router.get('/', verifyToken, (req, res) => {
    db.all(
        'SELECT * FROM alerts WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch alerts' });
            res.json(rows || []);
        }
    );
});

// POST /api/alerts/mark-read — mark all alerts as read
router.post('/mark-read', verifyToken, (req, res) => {
    db.run(
        'UPDATE alerts SET isRead = 1 WHERE userId = ?',
        [req.userId],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to mark alerts as read' });
            res.json({ success: true, updated: this.changes });
        }
    );
});

// Internal helper – insert an alert for a user
const insertAlert = (userId, type, message) => {
    db.run(
        'INSERT INTO alerts (userId, type, message) VALUES (?, ?, ?)',
        [userId, type, message]
    );
};

module.exports = { router, insertAlert };
