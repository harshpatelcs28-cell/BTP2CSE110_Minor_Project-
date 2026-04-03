const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../database');

const router = express.Router();

// Get mock dashboard stats
router.get('/stats', verifyToken, (req, res) => {
    // Generate some mock stats for the charts
    const mockYieldData = [
        { month: 'Jan', yield: 4000, rainfall: 240 },
        { month: 'Feb', yield: 3000, rainfall: 139 },
        { month: 'Mar', yield: 2000, rainfall: 980 },
        { month: 'Apr', yield: 2780, rainfall: 390 },
        { month: 'May', yield: 1890, rainfall: 480 },
        { month: 'Jun', yield: 2390, rainfall: 380 },
        { month: 'Jul', yield: 3490, rainfall: 430 },
    ];
    
    // Fetch last predictions from db instead of python model
    db.all('SELECT * FROM predictions WHERE userId = ? ORDER BY id DESC LIMIT 5', [req.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch predictions' });
        }
        res.json({
            yieldData: mockYieldData,
            recentPredictions: rows || [],
            overallHealth: 'Good',
            tipsCount: 14
        });
    });
});

module.exports = router;
