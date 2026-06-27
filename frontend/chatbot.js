(function() {
  'use strict';

  let chatHistory = [];
  let isOpen = false;
  let isEnabled = false;
  let isSending = false;
  let abortController = null;

  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSidebar = document.getElementById('chatSidebar');
  const toggleBtn = document.getElementById('chatToggleBtn');
  const sendButton = document.querySelector('.chat-send-btn');

  if (!chatMessages || !chatInput) {
    console.error('Elementi della chat non trovati. Verifica gli ID: #chatMessages, #chatInput.');
    return;
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function createMessageElement(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg chat-msg-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    const actionContainer = document.createElement('div');
    actionContainer.className = 'chat-action-container';
    wrap.appendChild(actionContainer);

    return wrap;
  }

  function appendMessage(role, text, action) {
    const msgElement = createMessageElement(role, text);
    const actionContainer = msgElement.querySelector('.chat-action-container');

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'chat-action-btn';
      btn.textContent = action.tab === 'map' ? '🗺 Mostra sulla mappa' : '→ Vai';
      btn.onclick = () => {
        if (action.roomId) {
          if (typeof navigateTo === 'function') navigateTo(action.roomId);
        } else if (action.tab) {
          if (typeof switchTab === 'function') switchTab(action.tab);
        }
        if (isOpen) toggleChat();
      };
      actionContainer.appendChild(btn);
    }

    chatMessages.appendChild(msgElement);
    scrollToBottom();
    return msgElement;
  }

  function createAssistantStreamingMessage() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-bot streaming';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = '';
    wrap.appendChild(bubble);

    const actionContainer = document.createElement('div');
    actionContainer.className = 'chat-action-container';
    wrap.appendChild(actionContainer);

    chatMessages.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function showError(message) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg-error';
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble error';
    bubble.textContent = '⚠️ ' + message;
    wrap.appendChild(bubble);
    chatMessages.appendChild(wrap);
    scrollToBottom();
  }

  window.toggleChat = function() {
    if (!isEnabled) return;
    isOpen = !isOpen;
    chatSidebar.classList.toggle('chat-open', isOpen);
    if (isOpen) {
      chatInput.focus();
      if (chatHistory.length === 0) {
        appendMessage('bot', 'Ciao! Come posso aiutarti? Puoi chiedermi dove si trovano aule, docenti o edifici.');
      }
    }
  };

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (isSending) {
      console.warn('Attendi il completamento della risposta.');
      return;
    }

    chatInput.value = '';
    isSending = true;
    if (sendButton) sendButton.disabled = true;

    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    const payload = {
      message: text,
      history: chatHistory
    };

    const streamingMsgEl = createAssistantStreamingMessage();
    const bubbleEl = streamingMsgEl.querySelector('.chat-bubble');
    let accumulatedText = '';

    try {
      abortController = new AbortController();
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!response.ok) {
        let errorMsg = `Errore ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch (_) {
          errorMsg = await response.text() || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonData = line.slice(6);
          try {
            const data = JSON.parse(jsonData);

            if (data.token) {
              accumulatedText += data.token;
              if (bubbleEl) bubbleEl.textContent = accumulatedText;
              scrollToBottom();
            }

            if (data.done) {
              streamingMsgEl.classList.remove('streaming');
              const finalText = data.text || accumulatedText;
              if (bubbleEl) bubbleEl.textContent = finalText;

              if (data.action) {
                const actionContainer = streamingMsgEl.querySelector('.chat-action-container');
                if (actionContainer) {
                  const btn = document.createElement('button');
                  btn.className = 'chat-action-btn';
                  btn.textContent = data.action.tab === 'map' ? '🗺 Mostra sulla mappa' : '→ Vai';
                  btn.onclick = () => {
                    if (data.action.roomId && typeof navigateTo === 'function') navigateTo(data.action.roomId);
                    else if (data.action.tab && typeof switchTab === 'function') switchTab(data.action.tab);
                    if (isOpen) window.toggleChat();
                  };
                  actionContainer.appendChild(btn);
                }
              }

              chatHistory.push({ role: 'assistant', content: finalText });

              isSending = false;
              if (sendButton) sendButton.disabled = false;
              abortController = null;
              return;
            }
          } catch (parseErr) {
            console.warn('Errore nel parsing SSE:', parseErr, 'line:', line);
          }
        }
      }
    } catch (err) {
      console.error('Errore durante sendMessage:', err);
      if (streamingMsgEl && streamingMsgEl.parentNode) {
        streamingMsgEl.remove();
      }
      showError(err.message || 'Impossibile ottenere una risposta. Riprova più tardi.');
    } finally {
      if (abortController) {
        abortController = null;
      }
      isSending = false;
      if (sendButton) sendButton.disabled = false;
    }
  }

  async function checkEnabled() {
    try {
      const r = await fetch('/api/settings');
      const s = await r.json();
      isEnabled = !!s.chatbotEnabled;
      chatSidebar.classList.toggle('chat-hidden', !isEnabled);
      if (toggleBtn) toggleBtn.classList.toggle('chat-hidden', !isEnabled);
    } catch (e) {
      console.warn('Impossibile recuperare le impostazioni del chatbot.', e);
    }
  }

  window.sendChatMessage = function() {
    sendMessage();
  };

  document.addEventListener('DOMContentLoaded', () => {
    checkEnabled();

    if (sendButton) {
      sendButton.addEventListener('click', sendMessage);
    }

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (!toggleBtn) {
      const foundBtn = document.querySelector('#chatToggleBtn') || document.querySelector('.chat-toggle-btn');
      if (foundBtn) {
        foundBtn.addEventListener('click', window.toggleChat);
      }
    } else {
      toggleBtn.addEventListener('click', window.toggleChat);
    }
  });

})();