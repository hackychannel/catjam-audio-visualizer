import { hostname as _hostname } from 'os';
import { lookup } from 'dns';
import express from 'express';
import pkg from 'request';
const { get } = pkg;

const app = express();
const hostname = _hostname();

const serverport = (process.env.PORT || process.env.PROXY_PORT || 3000);

const radiouri = 'https://relay.rainwave.cc/ocremix.ogg?1:2vyp1wlA4f';

app.get('/', (req, res) => {
    process.stdout.write('Connected to server\n');
    res.setHeader('Access-Control-Allow-Origin', '*');
    get(radiouri)
      .on('error', () => {})
      .on('response', () => {})
      .pipe(res);
});

app.listen(serverport, () => {
  lookup(hostname, (err, ip) => {
    // retrieve network local ip
    process.stdout.write('Audio Proxy Server runs under\n');
    process.stdout.write(`  Local:        http://locahost:${serverport}\n`);
    process.stdout.write(`  Home Network: http://${ip}:${serverport}\n`);
  });
});