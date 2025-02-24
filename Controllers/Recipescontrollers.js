const db = require("../utils/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();



const Get_All_Recipes_Controller=async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const offset = (page - 1) * limit;

    // Get paginated recipes
    const recipes = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM recipes  ORDER BY id DESC LIMIT ? OFFSET ?",
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
    // Return the response
    return res.status(200).json({
      data: recipes,
      cnt: totalRecipes,
    });
  } catch (error) {
    console.error("Database error:", error.message);
    return res.status(500).json({ error: "Internal server error occurred" });
  }
};

const Get_Filtered_Recipes_Controller=async (req, res) => {
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
};

const Get_Single_Recipe_Controller=async (req, res) => {
  const { id } = req.params;  
  await db.get(
    `SELECT recipes.*, users.name as author_name, users.profile_pic as author_dp 
     FROM recipes 
     JOIN users ON recipes.author_id = users.id 
     WHERE recipes.id=?`, 
    [id], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      console.log("recipe", row);
      res.status(200).json(row);
    }
  );
};

const Upload_Recipe_Controller=async (req, res) => {
    const { title, rating, ingredients, instructions, image, prep_time } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const query = `INSERT INTO recipes (title, rating, ingredients, instructions, image, prep_time, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    try {
      // Step 1: Insert the new recipe and get the new recipe ID
      const newRecipeId = await new Promise((resolve, reject) => {
        db.run(
          query,
          [title, rating, ingredients, instructions, image, prep_time, userId],
          function (err) {
            if (err) return reject(err);
            resolve(this.lastID); // Get the last inserted recipe ID
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
      if (user?.list_recipes) {
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

  
module.exports={
    Get_All_Recipes_Controller,
    Get_Filtered_Recipes_Controller,
    Get_Single_Recipe_Controller,
    Upload_Recipe_Controller
}
