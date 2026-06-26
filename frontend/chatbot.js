(function() {
  let chatHistory = [];
  let isOpen = false;
  let isEnabled = false;

  async function checkEnabled() {
    try {
      const r = await fetch('/api/settings');
      const s = await r.json();
      isEnabled = !!s.chatbotEnabled;
      document.getElementById('chatSidebar')?.classList.toggle('chat-hidden', !isEnabled);
      document.getElementById('chatToggleBtn')?.classList.toggle('chat-hidden', !isEnabled);
    } catch {}
  }

  function toggleChat() {
    isOpen = !isOpen;
    const sidebar = document.getElementById('chatSidebar');
    sidebar.classList.toggle('chat-open', isOpen);
    if (isOpen) {
      document.getElementById('chatInput').focus();
      if (chatHistory.length === 0) appendMessage('bot', 'Ciao! Come posso aiutarti? Puoi chiedermi dove si trovano aule, docenti o edifici.');
    }
  }

  function appendMessage(role, text, action) {
    const list = document.getElementById('chatMessages');
    const wrap = document.createElement('div');
    wrap.className = `chat-msg chat-msg-${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'chat-action-btn';
      btn.textContent = action.tab === 'map' ? '🗺 Mostra sulla mappa' : '→ Vai';
      btn.onclick = () => {
        if (action.roomId) navigateTo(action.roomId);
        else if (action.tab) switchTab(action.tab);
        toggleChat();
      };
      wrap.appendChild(btn);
    }

    list.appendChild(wrap);
    list.scrollTop = list.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    const typing = document.createElement('div');
    typing.className = 'chat-msg chat-msg-bot';
    typing.id = 'chatTyping';
    typing.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
    document.getElementById('chatMessages').appendChild(typing);
    document.getElementById('chatMessages').scrollTop = 99999;

    try {
      const r = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory.slice(-6) })
      });
      const data = await r.json();
      document.getElementById('chatTyping')?.remove();
      const reply = data.text || data.error || 'Errore.';
      appendMessage('bot', reply, data.action);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch {
      document.getElementById('chatTyping')?.remove();
      appendMessage('bot', '⚠ Errore di connessione.');
    }
  }

  window.toggleChat = toggleChat;
  window.sendChatMessage = sendMessage;

  document.addEventListener('DOMContentLoaded', () => {
    checkEnabled();
    document.getElementById('chatInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  });
})();