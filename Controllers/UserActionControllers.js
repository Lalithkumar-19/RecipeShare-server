const db = require("../utils/db");
const dotenv = require("dotenv");
const { default: OpenAI } = require("openai");
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.openai
});


const Get_Fav_Recipes_Controller=async (req, res) => {
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
          res.status(200).json(recipes);
        }
      );
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
};

const Save_Recipe_Controller=async (req, res) => {
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
};


const Remove_From_Saved_Controller= async (req, res) => {
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
};


// const Delete_Recipe_Controller = async (req, res) => {
//   console.log("Delete API called");
//   try {
//     const userId = req.user.id;
//     const recipeId = req.query.id;

//     if (!userId || !recipeId) {
//       return res.status(401).json({ msg: "User ID or recipe ID not provided" });
//     }

//     const query = `SELECT * FROM users WHERE id=?`;
//     db.get(query, [userId], async (err, row) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!row) return res.status(404).json({ msg: "User not found" });

//       let CreatedRecipes = [];
//       try {
//         CreatedRecipes = JSON.parse(row.list_recipes) || [];
//       } catch {
//         CreatedRecipes = [];
//       }

     

//       let newRecipes = CreatedRecipes.filter((recipe) => recipe !== recipeId);

//       // Step 1: Delete the recipe from the actual `recipes` table
//       db.run("DELETE FROM recipes WHERE id=?", [recipeId], (err) => {
//         if (err) return res.status(500).json({ error: err.message } );

//         // Step 2: Update user's `list_recipes` only if deletion was successful
//         db.run(
//           "UPDATE users SET list_recipes=?, recipes_created_cnt=? WHERE id=?",
//           [JSON.stringify(newRecipes), newRecipes.length, userId],
//           (err) => {
//             if (err) return res.status(500).json({ error: err.message });
//             return res.status(200).json({
//               msg: "Recipe deleted successfully",
//               cnt: newRecipes.length,
//             });
//           }
//         );
//       });
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ msg: "An error occurred", error });
//   }
// };


const Delete_Recipe_Controller = async (req, res) => {
  console.log("Delete API called");

  try {
    const userId = req.user.id;
    const recipeId = req.query.id;

    if (!userId || !recipeId) {
      return res.status(400).json({ msg: "User ID or recipe ID not provided" });
    }

    // Check if user exists
    const query = `SELECT * FROM users WHERE id=?`;
    db.get(query, [userId], async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ msg: "User not found" });

      let CreatedRecipes = [];
      try {
        CreatedRecipes = JSON.parse(row.list_recipes) || [];
      } catch {
        CreatedRecipes = [];
      }

      // Remove the recipe from the user's created recipes list
      let newRecipes = CreatedRecipes.filter((recipe) => recipe != recipeId);

      // Delete recipe from the recipes table
      db.run("DELETE FROM recipes WHERE id=?", [recipeId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Update user's created recipes
        db.run(
          "UPDATE users SET list_recipes=?, recipes_created_cnt=? WHERE id=?",
          [JSON.stringify(newRecipes), newRecipes.length, userId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Remove the recipe from all users' favorite lists
            db.all("SELECT id, fav_recipes FROM users", [], (err, users) => {
              if (err) return res.status(500).json({ error: err.message });

              users.forEach((user) => {
                let favRecipes = [];
                try {
                  favRecipes = JSON.parse(user.fav_recipes) || [];
                } catch {
                  favRecipes = [];
                }

                if (favRecipes.includes(recipeId)) {
                  let updatedFavRecipes = favRecipes.filter(
                    (fav) => fav !== recipeId
                  );

                  db.run(
                    "UPDATE users SET fav_recipes=?, fav_recipes_cnt=? WHERE id=?",
                    [
                      JSON.stringify(updatedFavRecipes),
                      updatedFavRecipes.length,
                      user.id,
                    ],
                    (err) => {
                      if (err)
                        console.error("Error updating favorite recipes:", err);
                    }
                  );
                }
              });

              return res.status(200).json({
                msg: "Recipe deleted successfully and removed from all favorites",
              });
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
};


const Get_FavRecipes_List_Controller=async (req, res) => {

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
};


// const Get_PostedRecipes_Controller=async (req, res) => {
//   try {
//     const userId = req.header("userid");

//     if (!userId) {
//       return res.status(400).json({ msg: "User ID is required" });
//     }
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 5;
//     const offset = (page - 1) * limit;

//     const query = "SELECT list_recipes FROM users WHERE id = ?";
//     await db.get(query, [userId], async (err, row) => {
//       if (err) {
//         return res.status(500).json({ error: err.message });
//       }
//       const postedRecipesId = JSON.parse(row.list_recipes);

//       const placeholders = postedRecipesId.map(() => "?").join(",");
//       const recipeQuery = `SELECT * FROM recipes WHERE id IN (${placeholders}) LIMIT ? OFFSET ?`;
//       const { cnt } = await db.all(`SELECT COUNT(*) as cnt FROM recipes WHERE id IN (${placeholders})`);

//       await db.all(
//         recipeQuery,
//         [...postedRecipesId, limit, offset],
//         (err, recipes) => {
//           if (err) {
//             return res.status(500).json({ error: err.message });
//           }
//           // console.log("recipes", recipes);
//           res.status(200).json({
//             data: recipes,
//             cnt: cnt
//           });
//         }
//       );
//     });
//   } catch (error) {
//     res.status(500).json({ msg: "An error occurred", error });
//   }
// };

const Get_PostedRecipes_Controller = async (req, res) => {
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
      
      if (!row || !row.list_recipes) { // Fix: Check if row exists
        return res.status(404).json({ msg: "No recipes found for this user" });
      }

      const postedRecipesId = JSON.parse(row.list_recipes) || [];
      if (postedRecipesId.length === 0) {
        return res.status(200).json({ data: [], cnt: 0 });
      }

      const placeholders = postedRecipesId.map(() => "?").join(",");
      const recipeQuery = `SELECT * FROM recipes WHERE id IN (${placeholders}) LIMIT ? OFFSET ?`;
      const countQuery = `SELECT COUNT(*) as cnt FROM recipes WHERE id IN (${placeholders})`;

      db.all(countQuery, postedRecipesId, (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.all(recipeQuery, [...postedRecipesId, limit, offset], (err, recipes) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(200).json({
            data: recipes,
            cnt: countResult[0]?.cnt || 0, 
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
};

const Generate_Recipe_Controller= async (req, res) => {
  try {
    const ingredients = req.query.ingredients;
    console.log(req.body, "body");
    //const ingredients="tomatos,onions,chicken";
    const completion = openai.chat.completions.create({
      model: "gpt-4o-mini",
      store: true,
      messages: [
        { "role": "user", "content": "Create a recipe with given these ingredients in 500 lines" + ingredients },
      ],
    });
    completion.then((result) => {
      // console.log(result.choices[0].message);

      res.status(200).json({ data: result.choices[0].message })
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occured", error })
  }
};
module.exports={
    Get_Fav_Recipes_Controller,
    Save_Recipe_Controller,
    Remove_From_Saved_Controller,
    Delete_Recipe_Controller,
    Get_FavRecipes_List_Controller,
    Get_PostedRecipes_Controller,
    Generate_Recipe_Controller,


}