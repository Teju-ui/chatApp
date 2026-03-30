require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Mock Database
const users = [];
const messages = [];

// Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'User exists' });
  }
  const user = { id: users.length + 1, username, password };
  users.push(user);
  res.json({ token: `mock-token-${user.id}`, user: { id: user.id, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  let user = users.find(u => u.username === username);

  if (!user) {
    // Auto-register for easier testing
    user = { id: users.length + 1, username, password };
    users.push(user);
    return res.json({ token: `mock-token-${user.id}`, user: { id: user.id, username } });
  }

  if (user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ token: `mock-token-${user.id}`, user: { id: user.id, username } });
});

// Messages API
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// Real-time Chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('send_message', async (data) => {
    messages.push(data);
    io.emit('receive_message', data);

    // Auto-respond to EVERY message (unless the sender is the AI itself)
    if (data && data.sender !== 'AI Assistant') {
      let prompt = data.text || '';
      if (prompt.startsWith('/ai ')) {
        prompt = prompt.substring(4);
      } else if (prompt.startsWith('/ai')) {
        prompt = prompt.substring(3);
      }

      let aiReplyText = "";

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
        aiReplyText = `To get real AI answers, please add your OPENAI_API_KEY to the backend/.env file and restart the server. Your prompt was: "${prompt}"`;
      } else {
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY.trim(),
            baseURL: 'https://api.groq.com/openai/v1'
          });
          const response = await openai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: 'You are a helpful, friendly, and concise AI chat assistant.' },
              { role: 'user', content: prompt }
            ],
          });
          aiReplyText = response.choices[0].message.content;
        } catch (error) {
          console.error("OpenAI Error:", error.message, error);
          aiReplyText = "I'm sorry, I encountered an error while processing your request. Please check API key/credits and try again.";
        }
      }

      const aiMessage = {
        id: Date.now(),
        text: aiReplyText,
        sender: 'AI Assistant',
        timestamp: new Date().toISOString()
      };
      messages.push(aiMessage);
      io.emit('receive_message', aiMessage);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
