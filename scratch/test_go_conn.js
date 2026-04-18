const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

console.log('Testing connection to Go backend at 127.0.0.1:8000...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`BODY: ${body}`);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('TIMEOUT: Request took too long');
  req.destroy();
  process.exit(1);
});

req.end();
