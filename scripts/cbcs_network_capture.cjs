'use strict';
// cbcs_network_capture.cjs
// Listens for CBCS API responses on the CBCS tab and captures ALL pages of data
// Run this WHILE Gregory manually clicks Search on the CBCS tab
// It will auto-detect the API responses and save them

const { WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const CBCS_TAB_ID = 'BFDE326AAD2D9340912CD3D8802A3091';
const DEVTOOLS_URL = 'http://127.0.0.1:9222';

async function main() {
  const tabList = await (await fetch(DEVTOOLS_URL + '/json/list')).json();
  const tab = tabList.find(t => t.id === CBCS_TAB_ID);
  if (!tab) { console.error('CBCS tab not found!'); process.exit(1); }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = {}, networkRequests = {};
  let msgId = 1;
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  
  const capturedData = [];
  
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h(m); }
    
    // Track CBCS API requests
    if (m.method === 'Network.requestWillBeSent') {
      const url = m.params?.request?.url || '';
      if (url.includes('cbcscomics') || url.includes('api/popreport')) {
        networkRequests[m.params.requestId] = { url, method: m.params.request.method, body: m.params.request.postData };
        console.log('[REQUEST]', m.params.request.method, url.substring(0, 80));
      }
    }
    
    // Capture CBCS API responses
    if (m.method === 'Network.responseReceived') {
      const reqId = m.params.requestId;
      if (networkRequests[reqId]) {
        const status = m.params.response.status;
        console.log('[RESPONSE]', status, networkRequests[reqId].url.substring(0, 80));
        if (status === 200) {
          // Get the response body
          const id = msgId++;
          pending[id] = async (resp) => {
            if (resp.result?.body) {
              try {
                const body = resp.result.base64Encoded
                  ? Buffer.from(resp.result.body, 'base64').toString('utf8')
                  : resp.result.body;
                const parsed = JSON.parse(body);
                console.log('[DATA] Got response! Records:', parsed?.Data?.length || parsed?.data?.length || 'unknown');
                capturedData.push({ url: networkRequests[reqId].url, request: networkRequests[reqId].body, response: parsed });
                fs.writeFileSync('scripts/cbcs_captured_data.json', JSON.stringify(capturedData, null, 2));
                console.log('[SAVED] cbcs_captured_data.json updated');
              } catch (e) { console.log('[PARSE ERROR]', e.message); }
            }
          };
          ws.send(JSON.stringify({ id, method: 'Network.getResponseBody', params: { requestId: reqId } }));
        }
      }
    }
  });
  
  const send = (method, params) => new Promise((res, rej) => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('T/O')); } }, 10000);
  });
  
  await send('Network.enable', {});
  
  console.log('=== CBCS Network Capture Active ===');
  console.log('Listening for CBCS API responses...');
  console.log('');
  console.log('Please:');
  console.log('  1. Click RESET on the CBCS tab to clear the spinner');
  console.log('  2. Type any comic title (e.g., "Amazing Spider-Man") + issue "1"');
  console.log('  3. Click SEARCH manually');
  console.log('');
  console.log('I will capture all API responses automatically.');
  console.log('');
  
  // Keep running until interrupted
  await new Promise(() => {}); // run forever
}

main().catch(e => console.error('Error:', e.message));
