// Vercel catch-all function for the Node HTTP handler.
const app = require('../server/server');
module.exports = (req, res) => app.emit('request', req, res);
