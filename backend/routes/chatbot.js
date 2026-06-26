const express = require('express');
const router = express.Router();
const { readDB } = require('../utils/db');
const { buildContext } = require('../utils/ragBuilder');

router.post('/', async (req, res) => {
  const settings = readDB().settings || {};
  if (!settings.chatbotEnabled) {
    return res.status(503).json({ error: 'Chatbot disabilitato.' });
  }

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Messaggio mancante.' });

  const systemPrompt = buildContext();

  const messages = [
    ...history.slice(-6), // ultimi 3 turni
    { role: 'user', content: message }
  ];

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:1.5b',
        stream: false,
        system: systemPrompt,
        messages
      })
    });

    const data = await ollamaRes.json();
    const text = data.message?.content || 'Nessuna risposta.';

    // Estrai action se presente
    const actionMatch = text.match(/ACTION:(\{.*?\})/);
    const action = actionMatch ? JSON.parse(actionMatch[1]) : null;
    const cleanText = text.replace(/ACTION:\{.*?\}/, '').trim();

    res.json({ text: cleanText, action });
  } catch (err) {
    res.status(500).json({ error: 'Errore Ollama: ' + err.message });
  }
});

module.exports = router;