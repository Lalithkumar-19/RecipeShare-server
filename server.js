const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const db = require("./utils/db");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Uploadmiddleware } = require("./middlewares/Imageuploader");
const app = express();
const PORT = 5000;
const multer = require("multer");
const nodemailer = require("nodemailer");
const { UserAuth } = require("./middlewares/UserAuth");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

const JWT_SECRET = process.env.SECRET_KEY;

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
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    // console.log({
    //   token,
    //   user: {
    //     id: user.id,
    //     email: user.email,
    //     name: user.name,
    //     fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
    //     list_recipes: user.list_recipes ? JSON.parse(user.list_recipes) : [],
    //     profile_pic: user.profile_pic,
    //     recipes_created: user.recipes_created_cnt,
    //     fav_recipes_cnt: user.fav_recipes_cnt,
    //   },
    // });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
        list_recipes: user.list_recipes ? JSON.parse(user.list_recipes) : [],
        profile_pic: user.profile_pic,
        recipes_created: user.recipes_created_cnt,
        fav_recipes_cnt: user.fav_recipes_cnt,
      },
    });
  });
});

// Normal signup (email/password)
app.post("/api/signup", async (req, res) => {
  console.log("sign up routee", req.body);
  const { email, password, name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
    [email, hashedPassword, name],
    function (err) {
      if (err) {
        console.log(err);
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(400).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error" });
      }
      return res.status(201).json({
        name,
      });
    }
  );
});

// Generate 6-digit OTP

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
          console.log("user is", user);
          const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            {
              expiresIn: "24h",
            }
          );
          return res.status(200).json({
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
              list_recipes: user.list_recipes
                ? JSON.parse(user.list_recipes)
                : [],
              profile_pic: user.profile_pic,
              recipes_created: user.recipes_created_cnt,
              fav_recipes_cnt: user.fav_recipes_cnt,
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
                expiresIn: "24h",
              });

              res.status(201).json({
                token,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  profile_pic: user.profile_pic,
                  recipes_created: user.recipes_created_cnt,
                  fav_recipes: user.fav_recipes
                    ? JSON.parse(user.fav_recipes)
                    : [],
                  list_recipes: user.list_recipes
                    ? JSON.parse(user.list_recipes)
                    : [],
                  fav_recipes_cnt: user.fav_recipes_cnt,
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

//forgot password and verification
app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;
  console.log(email, "lalith");
  if (!email) return res.status(400).json({ error: "Email is required" });

  db.get(
    "SELECT * FROM users WHERE email =?",
    [email],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry
      console.log(otp, "otp");
      // Store OTP in DB
      db.run(
        "INSERT OR REPLACE INTO otps (email, otp, expires_at) VALUES (?, ?, ?)",
        [email, otp, expiresAt],
        (err) => {
          console.log(err);
          if (err) return res.status(500).json({ error: "Database error" });

          // Send OTP Email

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "basavojuganesh@gmail.com",
              pass: process.env.EMAIL_APPCODE,
            },
          });

          const mailOptions = {
            from: "basavojuganesh@gmail.com",
            to: email,
            subject: "Forget Password From Recipe-share",
            text:
              "Your Password Reset OTP provided here and \n it will work only for 5 minuetes\n" +
              otp,
          };

          transporter.sendMail(mailOptions, (err) => {
            if (err)
              return res.status(500).json({ error: "Email sending failed" });
            res.status(200).json({ message: "OTP sent to email" });
          });
        }
      );
    }
  );
});

app.post("/api/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ error: "All fields are required" });

  db.get(
    "SELECT * FROM otps WHERE email = ? AND otp = ?",
    [email, otp],
    (err, otpEntry) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!otpEntry) return res.status(400).json({ error: "Invalid OTP" });

      if (new Date(otpEntry.expires_at) < new Date()) {
        return res.status(400).json({ error: "OTP expired" });
      }

      // Hash new password
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err)
          return res.status(500).json({ error: "Error hashing password" });

        // Update password in DB
        db.run(
          "UPDATE users SET password = ? WHERE email = ?",
          [hashedPassword, email],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });

            // Delete OTP after use
            db.run("DELETE FROM otps WHERE email = ?", [email], (err) => {
              if (err)
                return res.status(500).json({ error: "Error deleting OTP" });

              res.status(200).json({ message: "Password reset successful" });
            });
          }
        );
      });
    }
  );
});

app.get("/api/recipes", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const offset = (page - 1) * limit;

    // Get paginated recipes
    const recipes = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM recipes LIMIT ? OFFSET ?",
        [limit, offset],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Get total count of recipes
    const totalRecipes = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as cnt FROM recipes", [], (err, row) => {
        if (err) return reject(err);
        resolve(row.cnt);
      });
    });
    // console.log({
    //   data: recipes,
    //   cnt: totalRecipes,
    // });

    // Return the response
    return res.status(200).json({
      data: recipes,
      cnt: totalRecipes,
    });
  } catch (error) {
    console.error("Database error:", error.message);
    return res.status(500).json({ error: "Internal server error occurred" });
  }
});

app.get("/api/getFiltered", async (req, res) => {
  // console.log(req.query, "req");
  const { query, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  if (!query) {
    return res.status(400).json({ erorr: "Query param is required" });
  }
  const searchQuery = `%${query}%`;

  const getCount = () => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM recipes WHERE title LIKE ?`,
        [searchQuery],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });
  };

  const getRecipes = () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM recipes WHERE title LIKE ? LIMIT ? OFFSET ?`,
        [searchQuery, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  };

  Promise.all([getCount(), getRecipes()])
    .then(([totalRecipes, recipes]) => {
      // console.log({
      //   recipes,
      //   totalRecipes,
      //   currentPage: Number(page),
      //   totalPages: Math.ceil(totalRecipes / limit),
      // });
      res.status(200).json({
        recipes,
        totalRecipes,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecipes / limit),
      });
    })
    .catch((error) => {
      res.status(500).json({ error: "Database error", details: error.message });
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
  try {
    const userId = req.query.userId;
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
    // console.log("entered into save route");
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
      if (favouriteRecipes.length == 0) {
        favouriteRecipes.push(recipeId);
      } else {
        if (!favouriteRecipes.includes(recipeId)) {
          favouriteRecipes.push(recipeId);
        }
      }
      const query =
        "UPDATE users SET fav_recipes=?,fav_recipes_cnt=? WHERE id=?";
      await db.run(
        query,
        [JSON.stringify(favouriteRecipes), favouriteRecipes.length, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          // console.log(favouriteRecipes, "Added");
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
          // console.log(favouriteRecipes, "Added");
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

app.delete("/api/deleteRecipe",UserAuth,async (req, res) => {
  console.log("delete api called");
  try {
    const userId = req.user.id;
    const recipeId = req.query.id;
    if (!userId || !recipeId)
      res.status(401).json("user id or recipe not given");

    const query = `SELECT * FROM users WHERE id=?`;
    await db.all(query, [userId], async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) {
        return res.status(404).json({ msg: "User not found" });
      }
      let favouriteRecipes = [];
      try {
        favouriteRecipes = JSON.parse(row.fav_recipes) || [];
      } catch {
        favouriteRecipes = [];
      }
      let newRecipes = favouriteRecipes.filter((recipe) => recipe != recipeId);
      await db.run(
        "UPDATE users SET list_recipes=? WHERE id=?",
        [JSON.stringify(newRecipes), userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(200).json({
            msg: "Favourite recipes retrieved successfully",
            cnt: newRecipes.length,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
});

app.get("/api/getFavRecipeslist", async (req, res) => {

  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }
    const query = `SELECT  fav_recipes FROM users WHERE id=?`;
    await db.get(query, [userId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ msg: "User not found" });
      }
      let favouriteRecipes = [];
      try {
        favouriteRecipes = JSON.parse(row.fav_recipes) || [];
      } catch {
        favouriteRecipes = [];
      }

      res.status(200).json({
        msg: "Favourite recipes retrieved successfully",
        data: favouriteRecipes,
        cnt: favouriteRecipes.length,
      });
    });
  } catch (error) {
    console.log(error);
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
      const{cnt}=await db.all(`SELECT COUNT(*) as cnt FROM recipes WHERE id IN (${placeholders})`);
        
      await db.all(
        recipeQuery,
        [...postedRecipesId, limit, offset],
        (err, recipes) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          // console.log("recipes", recipes);
          res.status(200).json({
            data:recipes,
            cnt:cnt
          });
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
