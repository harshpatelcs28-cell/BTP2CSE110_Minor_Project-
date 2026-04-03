const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const token = jwt.sign({ id: this.lastID }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ auth: true, token, user: { id: this.lastID, name, email }});
    });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error on the server.' });
        if (!user) return res.status(404).json({ error: 'No user found.' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ auth: false, token: null, error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ auth: true, token, user: { id: user.id, name: user.name, email: user.email }});
    });
});

module.exports = router;
