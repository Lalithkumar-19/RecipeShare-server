const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const cookieParser =require("cookie-parser");
const bodyParser = require("body-parser");
dotenv.config();
const db = require("./utils/db");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Uploadmiddleware } = require("./middlewares/Imageuploader");
const app = express();
const PORT = 5000;
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const corsOptions={
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors(corsOptions));

const JWT_SECRET = process.env.SECRET_KEY;

// Google OAuth2 client setup
const googleClient = new OAuth2Client(
  "540400376676-o2b36bvf6cmclci206sqbmsf36190669.apps.googleusercontent.com"
);

// Routes

// Normal signup (email/password)
app.post("/api/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const dbUser = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row); 
      });
    });

    if (dbUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
        [email, hashedPassword, name],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID); 
        }
      );
    });

    res.status(201).json("User created successfully!");

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Normal login (email/password)
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row); 
      });
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid User" });
    }

    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log(token);
    res.cookie("access_token",token,{
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
  }).status(200).json("User logged in");

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// logout user ()
app.post("/api/logout", async (req, res ) => {
  try {
    res.clearCookie("access_token",{
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }).status(200).json({message:"Logged out successfully"});
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


app.post('/api/forget', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row); // row is undefined if no user exists
      });
    });

    if (!user) {
      next(new Error("User Not Found"));
    }
    else {


      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '5m' });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'basavojuganesh@gmail.com',
          pass: process.env.EMAIL_APPCODE
        }
      });

      const mailOptions = {
        from: 'basavojuganesh@gmail.com',
        to: email,
        subject: 'Forget Password',
        text: 'Your Password reset link is provided here and \n it will work only for 5 minuetes\n' + token
      };

      await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
      console.log(token);
      res.status(200).send("Successfully link sent to email");

    }
  }
  catch (err) {

    next(err);

  }
});


app.post('/api/forget/verify', async (req, res, next) => {
  try {

    const token = req.body.token;
    await jwt.verify(token, JWT_SECRET, (err, decode) => {

      if (err) {
        next(err);
      }
      else {
        res.json({ verified: true, email: decode.email });
        console.log(decode);

      }

    })
  }
  catch (err) {

    next(err);

  }

});


app.post('/api/passchange', async (req, res, next) => {
  console.log(req.body);
  const { token, password } = req.body;

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET); // No await needed here

    const email = decoded.email;
    const hashpassword = await bcrypt.hash(password, 10);
    console.log(hashpassword);

    // Update user password
    const result = await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashpassword, email], // Corrected variable name
        function (err) {
          if (err) reject(err);
          resolve(this.changes); // `this.changes` shows affected rows
        }
      );
    });

    // Check if any row was updated
    if (result === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    next(err);
  }
});




// Google login
app.post("/api/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    // Verify Google Token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience:
        "540400376676-o2b36bvf6cmclci206sqbmsf36190669.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE google_id = ? OR email = ?",
        [googleId, email],
        (err, row) => {
          if (err) reject(err);
          resolve(row); // If no user, row will be undefined
        }
      );
    });

    if (user) {
      // Existing user → Generate JWT
      console.log("User found:", user);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
          list_recipes: user.list_recipes ? JSON.parse(user.list_recipes) : [],
          profile_pic: user.profile_pic,
          recipes_created: user.recipes_created_cnt || 0,
          fav_recipes_cnt: user.fav_recipes_cnt || 0,
        },
      });
    }

    // New user → Insert into database
    const newUserId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (google_id, email, name, profile_pic) VALUES (?, ?, ?, ?)",
        [googleId, email, name, picture],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID); // Get the last inserted user ID
        }
      );
    });

    // Generate JWT for new user
    const newToken = jwt.sign({ id: newUserId, email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      token: newToken,
      user: {
        id: newUserId,
        email,
        name,
        profile_pic: picture,
        recipes_created: 0,
        fav_recipes: [],
        list_recipes: [],
        fav_recipes_cnt: 0,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);
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
app.post(
  "/api/recipes",
  upload.single("image"),
  Uploadmiddleware,
  async (req, res) => {
    const { title, rating, ingredients, instructions, image, prep_time } =
      req.body;

    const userId = req.header("userId");

    const query = `INSERT INTO recipes (title, rating, ingredients, instructions, image, prep_time) VALUES (?, ?, ?, ?, ?, ?)`;

    try {
      // Step 1: Insert the new recipe and get the new recipe ID
      const newRecipeId = await new Promise((resolve, reject) => {
        db.run(
          query,
          [title, rating, ingredients, instructions, image, prep_time],
          function (err) {
            if (err) return reject(err);
            resolve(this.lastID); // Correctly access lastID
          }
        );
      });

      // Step 2: Fetch the user's current list_recipes
      const getUserQuery = `SELECT list_recipes FROM users WHERE id = ?`;
      const user = await new Promise((resolve, reject) => {
        db.get(getUserQuery, [userId], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });

      // Step 3: Update the list_recipes
      let listRecipes = [];
      if (user.list_recipes) {
        try {
          listRecipes = JSON.parse(user.list_recipes) || [];
        } catch {
          listRecipes = [];
        }
      }
      listRecipes.push(newRecipeId);

      // Step 4: Update the user's list_recipes and recipes_created_cnt
      const updateUserQuery = `UPDATE users SET list_recipes = ?, recipes_created_cnt = ? WHERE id = ?`;
      await new Promise((resolve, reject) => {
        db.run(
          updateUserQuery,
          [JSON.stringify(listRecipes), listRecipes.length, userId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      res.status(201).json({
        msg: "Recipe added successfully",
        recipeId: newRecipeId,
        cnt: listRecipes.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ Error: error.message });
    }
  }
);

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

app.get("/api/getFavRecipes", async (req, res) => {
  console.log("added /...");
  try {
    const userId = req.query.userId;
    console.log("added /...");

    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const query = "SELECT * FROM users WHERE id = ?";
    await db.get(query, [userId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row || !row.fav_recipes) {
        return res.status(404).json({ msg: "No recipes found for this user" });
      }

      const postedRecipesId = JSON.parse(row.fav_recipes);

      const placeholders = postedRecipesId.map(() => "?").join(",");
      const recipeQuery = `SELECT * FROM recipes WHERE id IN (${placeholders}) LIMIT ? OFFSET ?`;

      await db.all(
        recipeQuery,
        [...postedRecipesId, limit, offset],
        (err, recipes) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          console.log("recipeshhjh", recipes);
          res.status(200).json(recipes);
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
});

app.post("/api/saveRecipe", async (req, res) => {
  try {
    console.log("entered into save route");
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }
    const recipeId = req.query.id;
    const query = `SELECT * FROM users WHERE id=?`;
    await db.get(query, [userId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ msg: "User not found" });
      }

      let favouriteRecipes = [];
      if (row.fav_recipes) {
        try {
          favouriteRecipes = JSON.parse(row.fav_recipes) || [];
        } catch {
          favouriteRecipes = [];
        }
      }
      favouriteRecipes.push(recipeId);
      const query =
        "UPDATE users SET fav_recipes=?,fav_recipes_cnt=? WHERE id=?";
      await db.run(
        query,
        [JSON.stringify(favouriteRecipes), favouriteRecipes.length, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          console.log(favouriteRecipes, "Added");
          res.status(200).json({
            msg: "Recipe saved successfully",
            data: favouriteRecipes,
            cnt: favouriteRecipes.length,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
});

app.put("/api/removeFromSaved", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }
    const recipeId = req.query.id;
    const query = `SELECT * FROM users WHERE id=?`;
    await db.get(query, [userId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ msg: "User not found" });
      }

      let favouriteRecipes = [];
      if (row.fav_recipes) {
        try {
          favouriteRecipes = JSON.parse(row.fav_recipes) || [];
        } catch {
          favouriteRecipes = [];
        }
      }
      const newrecipes = favouriteRecipes.filter((item) => item != recipeId);
      const query =
        "UPDATE users SET fav_recipes=?,fav_recipes_cnt=? WHERE id=?";
      await db.run(
        query,
        [JSON.stringify(newrecipes), favouriteRecipes.length, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          console.log(favouriteRecipes, "Added");
          res.status(200).json({
            msg: "Recipe unsaved successfully",
            data: newrecipes,
            cnt: newrecipes.length,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
});

app.get("/api/getpostedRecipes", async (req, res) => {
  try {
    const userId = req.header("userid");

    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const query = "SELECT list_recipes FROM users WHERE id = ?";
    await db.get(query, [userId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row || !row.list_recipes) {
        return res.status(404).json({ msg: "No recipes found for this user" });
      }

      const postedRecipesId = JSON.parse(row.list_recipes);

      const placeholders = postedRecipesId.map(() => "?").join(",");
      const recipeQuery = `SELECT * FROM recipes WHERE id IN (${placeholders}) LIMIT ? OFFSET ?`;

      await db.all(
        recipeQuery,
        [...postedRecipesId, limit, offset],
        (err, recipes) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          console.log("recipes", recipes);
          res.status(200).json(recipes);
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
