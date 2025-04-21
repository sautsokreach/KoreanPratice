// app.js - Main application file
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = 3000;

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Set up PostgreSQL connection
const pool = new Pool({
  user: 'u1eddn8e19uuu1',
  host: 'c8lj070d5ubs83.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
  database: 'd5gune4c1018eh',
  password: 'p135da798e3f3ed04233e4d409b8e09a3a6e3819544bf43638f1bd080b6a0de2c',
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
        english TEXT NOT NULL
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

// Add a new word
app.post('/api/words', async (req, res) => {
  const { korean, english } = req.body;
  
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
      'INSERT INTO words (korean, english) VALUES ($1, $2) RETURNING id',
      [korean, english]
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

app.post('/api/words/multi', async (req, res) => {
  for(var i=0 ; i < req.body.length; i++){

    const { korean, english } = req.body[i];
  
    if (!korean || !english) {
      console.log(req.body[i])
      return res.status(400).json({ error: 'Korean and English words are required' });
    }
    
    try {
      // Check if Korean word already exists
      const checkResult = await pool.query('SELECT * FROM words WHERE korean = $1', [korean]);
      
      if (checkResult.rows.length > 0) {
        continue; // skip when i is 5
      }
      
      // Insert the new word
      const insertResult = await pool.query(
        'INSERT INTO words (korean, english) VALUES ($1, $2) RETURNING id',
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

// Serve the main application page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app; // For testing