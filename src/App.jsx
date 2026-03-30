import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Send, Moon, Sun, User, LogOut } from 'lucide-react';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });
    return () => socket.off('receive_message');
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAuth = async (isLogin) => {
    try {
      const endpoint = isLogin ? 'login' : 'register';
      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, { username, password });
      setUser(res.data.user);
      setError('');
      // Fetch initial messages
      const msgs = await axios.get('http://localhost:5000/api/messages');
      setMessages(msgs.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    const msg = {
      id: Date.now(),
      text: input,
      sender: user.username,
      timestamp: new Date().toISOString()
    };
    socket.emit('send_message', msg);
    setInput('');
  };

  if (!user) {
    return (
      <div className={`auth-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="auth-card">
          <h2>Welcome to AI Chat</h2>
          <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          {error && <div className="error">{error}</div>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="auth-buttons">
            <button onClick={() => handleAuth(true)}>Login</button>
            <button className="secondary" onClick={() => handleAuth(false)}>Register</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <header className="chat-header">
        <div className="user-info">
          <User size={24} />
          <span>{user.username}</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle Theme">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="icon-btn logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="messages-container">
        {messages.map((msg) => (
           <div key={msg.id} className={`message-wrapper ${msg.sender === user.username ? 'sent' : 'received'}`}>
             {msg.sender !== user.username && <div className="sender-name">{msg.sender}</div>}
             <div className="message-bubble">
               {msg.text}
             </div>
             <div className="timestamp">
               {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
           </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message or use /ai for assistant..."
        />
        <button type="submit" disabled={!input.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

export default App;
