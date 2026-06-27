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
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user', content: message }
  ];

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        stream: true,  
         system: systemPrompt,
          messages,
          options: {
            num_predict: 80,          
            temperature: 0.5,         
            num_thread: 8             
          }
        })
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = ollamaRes.body.getReader();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullText += data.message.content;
              res.write(`data: ${JSON.stringify({ token: data.message.content })}\n\n`);
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    const actionMatch = fullText.match(/ACTION:(\{.*?\})/);
    const action = actionMatch ? JSON.parse(actionMatch[1]) : null;
    const cleanText = fullText.replace(/ACTION:\{.*?\}/, '').trim();

    res.write(`data: ${JSON.stringify({ done: true, text: cleanText, action })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Errore Ollama: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;