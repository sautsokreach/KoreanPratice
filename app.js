// app.js - Main application file
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));


// Set up PostgreSQL connection
const pool = new Pool({
  user: 'ue11ins90aicdo',
  host: 'cd5gks8n4kb20g.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
  database: 'dd480a9teqdfsp',
  password: 'p3e8ce02ae0ac7f204852f07cf7e6d50fb9c859f53e57bac6f877b03448b496ae',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,  // For local development or cloud services
  }
});

// Initialize database
const initDatabase = async () => {
  try {
    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS words (
        id SERIAL PRIMARY KEY,
        korean TEXT UNIQUE NOT NULL,
        english TEXT NOT NULL,
        khmer TEXT
      )
    `);
    
    console.log('Database initialized');
    
    // Check if we need to add sample data
    const result = await pool.query('SELECT COUNT(*) FROM words');
    if (parseInt(result.rows[0].count) === 0) {
      // Insert initial words
      const initialWords = [
        ['안녕하세요', 'hello'],
        ['감사합니다', 'thank you'],
        ['이름', 'name'],
        ['학교', 'school'],
        ['친구', 'friend']
      ];
      
      const insertPromises = initialWords.map(word => 
        pool.query(
          'INSERT INTO words (korean, english) VALUES ($1, $2) ON CONFLICT (korean) DO NOTHING',
          [word[0], word[1]]
        )
      );
      
      await Promise.all(insertPromises);
      console.log('Sample data inserted');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

// Initialize the database when app starts
initDatabase();

// API Routes

// Get all words
app.get('/api/words', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM words ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/message', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM message ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/grammars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grammar ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a specific word by ID
app.put('/api/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build the SET part of the query dynamically based on provided fields
    const fields = Object.keys(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field]);
    
    // Add the ID as the last parameter
    values.push(id);
    
    const query = `
      UPDATE words 
      SET ${setClause} 
      WHERE id = $${values.length} 
      RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating word:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a specific word by ID
app.put('/api/grammars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build the SET part of the query dynamically based on provided fields
    const fields = Object.keys(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field]);
    
    // Add the ID as the last parameter
    values.push(id);
    
    const query = `
      UPDATE grammar 
      SET ${setClause} 
      WHERE id = $${values.length} 
      RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating word:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new word
app.post('/api/words', async (req, res) => {
  const { korean, english,khmer } = req.body;
  
  if (!korean || !english) {
    return res.status(400).json({ error: 'Korean and English words are required' });
  }
  
  try {
    // Check if Korean word already exists
    const checkResult = await pool.query('SELECT * FROM words WHERE korean = $1', [korean]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'This Korean word already exists in the database' });
    }
    
    // Insert the new word
    const insertResult = await pool.query(
      'INSERT INTO words (korean, english,khmer) VALUES ($1, $2,$3) RETURNING id',
      [korean, english,khmer]
    );
    
    res.status(201).json({
      id: insertResult.rows[0].id,
      korean,
      english,
      message: 'Word added successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/message', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'message are required' });
  }
    // Insert the new word
    const insertResult = await pool.query(
      'INSERT INTO message (content) VALUES ($1) RETURNING id',
      [content]
    );
    
    res.status(201).json({
      id: insertResult.rows[0].id,
      message: 'message added successfully'
    });

});

app.post('/api/words/multi', async (req, res) => {
  for(var i=0 ; i < req.body.length; i++){

    const { korean, english } = req.body[i];
  
    if (!korean || !english) {
      console.log(req.body[i])
      return res.status(400).json({ error: 'Korean and English words are required' });
    }
    
    try {
      // Check if Korean word already exists
      const checkResult = await pool.query('SELECT * FROM wordsV2 WHERE korean = $1', [korean]);
      
      if (checkResult.rows.length > 0) {
        continue; // skip when i is 5
      }
      
      // Insert the new word
      const insertResult = await pool.query(
        'INSERT INTO wordsV2 (korean, english) VALUES ($1, $2) RETURNING id',
        [korean, english]
      );
      insertResult.rows[0].id;
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  
});

// Generate quiz questions
app.get('/api/quiz', async (req, res) => {
  const count = parseInt(req.query.count) || 5; // Default to 5 questions
  
  try {
    // Get random words for the quiz
    const wordsResult = await pool.query('SELECT * FROM words ORDER BY RANDOM() LIMIT $1', [Math.max(count * 4, 20)]);
    const words = wordsResult.rows;
    
    if (words.length < 4) {
      return res.status(400).json({ error: 'Not enough words in the database to create a quiz' });
    }
    
    // Create quiz questions
    const questions = [];
    const usedIndices = new Set();
    
    for (let i = 0; i < Math.min(count, Math.floor(words.length / 4)); i++) {
      // Select a word that hasn't been used as a correct answer yet
      let correctIndex;
      do {
        correctIndex = Math.floor(Math.random() * words.length);
      } while (usedIndices.has(correctIndex));
      
      usedIndices.add(correctIndex);
      const correctWord = words[correctIndex];
      
      // Create 3 wrong options
      const options = [correctWord.english];
      const usedOptionIndices = new Set([correctIndex]);
      
      while (options.length < 4) {
        const optionIndex = Math.floor(Math.random() * words.length);
        if (!usedOptionIndices.has(optionIndex)) {
          usedOptionIndices.add(optionIndex);
          options.push(words[optionIndex].english);
        }
      }
      
      // Shuffle options
      for (let j = options.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [options[j], options[k]] = [options[k], options[j]];
      }
      
      // Find the correct answer's position
      const correctAnswerIndex = options.indexOf(correctWord.english);
      
      questions.push({
        id: correctWord.id,
        korean: correctWord.korean,
        options: options,
        correctIndex: correctAnswerIndex
      });
    }
    
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Generate quiz questions
app.get('/api/randomword', async (req, res) => {
  
  try {
    // Get random words for the quiz
    const wordsResult = await pool.query('SELECT * FROM words ORDER BY RANDOM() LIMIT $1', [20]);
    const words = wordsResult.rows;
    
    if (words.length < 4) {
      return res.status(400).json({ error: 'Not enough words in the database to create a quiz' });
    }
    
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate quiz questions
app.get('/api/randomgrammar', async (req, res) => {
  
  try {
    // Get random words for the quiz
    const wordsResult = await pool.query('SELECT * FROM grammar ORDER BY RANDOM() LIMIT $1', [20]);
    const words = wordsResult.rows;
    
    if (words.length < 4) {
      return res.status(400).json({ error: 'Not enough words in the database to create a quiz' });
    }
    
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the main application page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/exercise', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exercise.html'));
});
app.get('/exercise2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exercise2.html'));
});

app.get('/exercise3', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exercise3.html'));
});

app.get('/grammar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'grammar.html'));
});

app.get('/message', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'message.html'));
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exercise2.html'));
});

// const WebSocket = require('ws');

// // Attach WebSocket server to existing HTTP server
// const wss = new WebSocket.Server({ app });
// // const wss = new WebSocket.Server(server, () => {
// //   console.log('WebSocket server is listening on ws://localhost:8080');
// // });

// // Handle new connections
// wss.on('connection', (ws) => {
//   console.log('New client connected');

//   // Send a welcome message to the client
//   ws.send('Welcome to the WebSocket server!');

//   // Handle messages from the client
//   ws.on('message', (message) => {
//     console.log(`Received: ${message}`);

//     // Echo the message back to the client
//     ws.send(`Server received: ${message}`);
//   });

//   // Handle client disconnection
//   ws.on('close', () => {
//     console.log('Client disconnected');
//   });
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


module.exports = app; // For testing