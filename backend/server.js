require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const predictRoutes = require('./routes/predict');
const datasetRoutes = require('./routes/dataset');
const { router: alertsRouter } = require('./routes/alerts');
const realtimeRoutes = require('./routes/realtime');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/dataset', datasetRoutes);
app.use('/api/alerts', alertsRouter);
app.use('/api/realtime', require('./routes/realtime'));
app.use('/api/forecast', require('./routes/forecast'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
