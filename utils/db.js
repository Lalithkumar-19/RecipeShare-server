const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbpath = path.join(__dirname, "recipee.db");
const db = new sqlite3.Database(dbpath, (err) => {
  if (err) {
    console.log("Database connection failed", err.message);
  } else {
    console.log("Connected to the SQLite database");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      rating TEXT DEFAULT 4.3,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      image TEXT NOT NULL,
      prep_time TEXT NOT NULL,
      comments TEXT DEFAULT '[]',
      author_id INTEGER NOT NULL,
      ratings TEXT DEFAULT '[]',
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);


  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      google_id TEXT,
      name TEXT NOT NULL,
      profile_pic TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      recipes_created_cnt INTEGER DEFAULT 0,
      fav_recipes_cnt INTEGER DEFAULT 0,
      list_recipes TEXT,
      fav_recipes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      rating REAL DEFAULT 2,
      author INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author) REFERENCES users(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    )
  `);
});

module.exports = db;