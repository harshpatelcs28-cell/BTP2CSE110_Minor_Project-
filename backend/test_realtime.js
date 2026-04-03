const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'secret');

async function testRealtime() {
    try {
        const res = await fetch('http://localhost:5000/api/realtime/weather?lat=28.6&lon=77.2&crop=Rice', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testRealtime();
