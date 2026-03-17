import fetch from 'node-fetch';
import { spawn } from 'child_process';

async function testServer() {
  const server = spawn('npx', ['tsx', 'server.ts'], { shell: true });
  
  server.stdout.on('data', (data) => {
    console.log(`SERVER: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`SERVER ERROR: ${data}`);
  });
  
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for server to start
  
  try {
    const res = await fetch('http://localhost:3000/api/settings');
    const data = await res.json();
    console.log('Server fetch successful:', data);
  } catch (error) {
    console.error('Server fetch failed:', error);
  } finally {
    server.kill();
  }
}

testServer();
