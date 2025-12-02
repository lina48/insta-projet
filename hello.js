const http = require('http'); 
// créer un serveur 
const server = http.createServer((req, res) => {res.statuscode = 200; 
     res.setHeader('content-type', 'text/plain'); 
       res.end('bonjour, node.js !');}); 
       // le serveur écoute sur le port 3000 
       const port = 3000; 
       server.listen(port, () => { console.log(`le serveur tourne sur http://localhost:${port}/`);});