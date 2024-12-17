const express = require("express");
const cors = require("cors");
const db = require("./utils/db");
const { OAuth2Client } = require("google-auth-library");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

const JWT_SECRET = "your_secret_keyekvjkj";

// Google OAuth2 client setup
const googleClient = new OAuth2Client(
  "540400376676-o2b36bvf6cmclci206sqbmsf36190669.apps.googleusercontent.com"
);

// Routes

// Normal login (email/password)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email}, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile_pic: user.profile_pic,
      },
    });
  });
});


// Normal signup (email/password)
app.post("/api/signup", async (req, res) => {
  const { email, password, name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
    [email, hashedPassword, name],
    function (err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(400).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error" });
      }

      res.status(201).json({
        name,
      });
    }
  );
});









// Google login
app.post("/api/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience:
        "540400376676-o2b36bvf6cmclci206sqbmsf36190669.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    db.get(
      "SELECT * FROM users WHERE google_id = ? OR email = ?",
      [googleId, email],
      (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (user) {
          // User exists, generate JWT
          const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            {
              expiresIn: "1h",
            }
          );

          return res.status(200).json({
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              profile_pic: user.profile_pic,
            },
          });
        } else {
          // New user
          db.run(
            "INSERT INTO users (google_id, email, name, profile_pic) VALUES (?, ?, ?, ?)",
            [googleId, email, name, picture],
            function (err) {
              if (err)
                return res.status(500).json({ message: "Database error" });

              const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, {
                expiresIn: "1h",
              });

              res.status(201).json({
                token,
                user: {
                  id: this.lastID,
                  email,
                  name,
                  profile_pic: picture,
                },
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(401).json({ message: "Invalid Google token" });
  }
});





app.get("/api/recipes", async (req, res) => {
  await db.all("SELECT * FROM recipes", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!rows) {
      return res.status(404).json("NO recipees founded");
    }
    return res.status(200).json(rows);
  });
});


app.get("/api/recipes/:id", async (req, res) => {
  const { id } = req.params;
  await db.get("SELECT * FROM recipes WHERE id=?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    if (!row) {
      res.status(404).json({ error: "Recipe not found" });
    }
    res.status(200).json(row);
  });
});

app.post("api/recipes", async (req, res) => {
  const { title, rating, ingredients, instructions, image, prep_time } = req.body;
  const query = `
    INSERT INTO recipes (title,rating,ingredients,instructions,image,prep_time) VALUES(?,?,?,?,?,?)`;

  await db.run(
    query,
    [title, rating, ingredients, instructions, image, prep_time],
    (err) => {
      if (err) {
        res.status(500).json({ Error: err.message });
      }
      res.status(201).json({ id: this.lastId });
    }
  );
});

//adding comment

app.post("/api/recipes/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  const query = `
    INSERT INTO comments (recipe_id,content,author) VALUES (?,?,?)`;
  await db.run(query, [id, content, author], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastId });
  });
});

app.get("/api/recipes/:id/comments", async (req, res) => {
  const { id } = req.params;
  await db.all(
    "SELECT * FROM comments WHERE recipe_id = ?",
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
