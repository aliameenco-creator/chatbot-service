(function () {
  'use strict';

  // Read client ID from the script tag's data attribute
  var scripts = document.querySelectorAll('script[data-client-id]');
  var currentScript = scripts[scripts.length - 1];
  var clientId = currentScript ? currentScript.getAttribute('data-client-id') : null;

  // Derive the API base URL from the script's src
  var scriptSrc = currentScript ? currentScript.src : '';
  var apiBase = scriptSrc.replace('/widget.js', '');

  if (!clientId) {
    console.error('[Chatbot] No data-client-id found on script tag.');
    return;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#cb-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#2563eb;color:#fff;border:none;cursor:pointer;font-size:26px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999;display:flex;align-items:center;justify-content:center;transition:background .2s}',
    '#cb-bubble:hover{background:#1d4ed8}',
    '#cb-panel{position:fixed;bottom:92px;right:24px;width:340px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 110px);background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);display:flex;flex-direction:column;z-index:99999;overflow:hidden;transition:opacity .2s,transform .2s}',
    '#cb-panel.cb-hidden{opacity:0;pointer-events:none;transform:translateY(12px)}',
    '#cb-header{background:#2563eb;color:#fff;padding:14px 16px;font-size:15px;font-weight:600;font-family:sans-serif}',
    '#cb-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-family:sans-serif;font-size:14px}',
    '.cb-msg{max-width:82%;padding:9px 13px;border-radius:12px;line-height:1.45;word-break:break-word}',
    '.cb-msg.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:3px}',
    '.cb-msg.bot{align-self:flex-start;background:#f1f5f9;color:#1e293b;border-bottom-left-radius:3px}',
    '#cb-footer{display:flex;padding:10px;gap:8px;border-top:1px solid #e2e8f0}',
    '#cb-input{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:14px;outline:none;font-family:sans-serif}',
    '#cb-input:focus{border-color:#2563eb}',
    '#cb-send{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:14px;font-weight:600}',
    '#cb-send:disabled{opacity:.5;cursor:default}',
  ].join('');
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────────────────────
  var bubble = document.createElement('button');
  bubble.id = 'cb-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML = '&#128172;';

  var panel = document.createElement('div');
  panel.id = 'cb-panel';
  panel.classList.add('cb-hidden');
  panel.innerHTML = [
    '<div id="cb-header">Chat with us</div>',
    '<div id="cb-messages"></div>',
    '<div id="cb-footer">',
    '  <input id="cb-input" type="text" placeholder="Type a message…" autocomplete="off" />',
    '  <button id="cb-send">Send</button>',
    '</div>',
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var messages = document.getElementById('cb-messages');
  var input = document.getElementById('cb-input');
  var sendBtn = document.getElementById('cb-send');
  var isOpen = false;

  // ── Toggle panel ─────────────────────────────────────────────────────────────
  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.remove('cb-hidden');
      input.focus();
      bubble.innerHTML = '&#10005;';
    } else {
      panel.classList.add('cb-hidden');
      bubble.innerHTML = '&#128172;';
    }
  });

  // ── Add a message bubble ──────────────────────────────────────────────────────
  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'cb-msg ' + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // ── Send a message ────────────────────────────────────────────────────────────
  function send() {
    var text = input.value.trim();
    if (!text) return;

    addMsg('user', text);
    input.value = '';
    sendBtn.disabled = true;
    input.disabled = true;

    var botDiv = addMsg('bot', '…');

    fetch(apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, clientId: clientId }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (d) {
            throw new Error(d.error || 'Server error ' + res.status);
          });
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var accumulated = '';

        function read() {
          return reader.read().then(function (result) {
            if (result.done) {
              sendBtn.disabled = false;
              input.disabled = false;
              input.focus();
              return;
            }
            accumulated += decoder.decode(result.value, { stream: true });
            botDiv.textContent = accumulated;
            messages.scrollTop = messages.scrollHeight;
            return read();
          });
        }
        return read();
      })
      .catch(function (err) {
        botDiv.textContent = 'Sorry, something went wrong. Please try again.';
        console.error('[Chatbot]', err);
        sendBtn.disabled = false;
        input.disabled = false;
      });
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
