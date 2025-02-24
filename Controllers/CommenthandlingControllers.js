const db = require("../utils/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


const Post_Comment_Controller=async (req, res) => {
  try {
    const { recipe_id, content, rating } = req.body;
    const author = req.user.id;

    if (!recipe_id || !content) {
      return res.status(400).json({ error: "Recipe ID and content are required" });
    }

    const safeRating = Number.isFinite(rating) ? rating : 2;

    //update current rating of recipe
     db.get("SELECT ratings FROM recipes WHERE id = ?", [recipe_id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      let ratingsArray = [];
      if (row?.ratings) {
        try {
          ratingsArray = JSON.parse(row.ratings);
        } catch {
          ratingsArray = [];
        }
      }

      // Add new rating
      ratingsArray.push(parseFloat(safeRating));

      // Calculate the new average rating
      const newAverageRating =
        ratingsArray.reduce((sum, val) => sum + val, 0) / ratingsArray.length;
      db.run("UPDATE recipes SET rating=? WHERE id=?",[newAverageRating,recipe_id],(err)=>{
        if(err) return res.status(500).json("server error occured");
      })
     })
    
    // Insert the comment
    const insertQuery = `INSERT INTO comments (recipe_id, content, rating, author) VALUES (?, ?, ?, ?)`;
    db.run(insertQuery, [recipe_id, content, safeRating, author], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const commentId = this.lastID; // Get the last inserted comment ID
      
      // Fetch and update comments list in recipes table
      db.get("SELECT comments FROM recipes WHERE id = ?", [recipe_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let existingComments = [];
        try {
          existingComments = row && row.comments ? JSON.parse(row.comments) : [];
        } catch {
          existingComments = [];
        }

        existingComments.push(commentId);
        const updatedComments = JSON.stringify(existingComments);

        db.run("UPDATE recipes SET comments = ? WHERE id = ?", [updatedComments, recipe_id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.get(
            `SELECT comments.id, comments.content, comments.rating, comments.created_at,comments.author, 
             users.name AS author_name, users.profile_pic AS author_dp 
             FROM comments 
             JOIN users ON comments.author = users.id 
             WHERE comments.id = ?`,
            [commentId],
            (err, newComment) => {
              if (err) return res.status(500).json({ error: err.message });
              
              db.get(`SELECT COUNT(*) as cnt FROM comments WHERE recipe_id = ?`, [recipe_id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                
                return res.status(201).json({
                  msg: "Comment added successfully",
                  newComment,
                  total: row.cnt
                });
              });
            }
          );
        });
      });
    });
  } catch (error) {
    res.status(500).json({ msg: "An error occurred", error });
  }
};


const Get_Comments_Controller=async (req, res) => {
  try {
    const { recipe_id, page } = req.query;
    const limit = 10;
    const offset = ((parseInt(page) || 1) - 1) * limit;

    if (!recipe_id) {
      return res.status(400).json({ error: "Recipe ID is required" });
    }

    // Fetch the comments list from recipes table
    db.get("SELECT comments FROM recipes WHERE id = ?", [recipe_id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let commentIds = [];
      try {
        commentIds = row && row.comments ? JSON.parse(row.comments) : [];
      } catch {
        commentIds = [];
      }
      
      if (commentIds.length === 0) {
        return res.status(200).json({ data: [], total: 0, page: parseInt(page) || 1, totalPages: 0 });
      }
      
      const placeholders = commentIds.map(() => "?").join(",");
      
      db.all(
        `SELECT comments.id, comments.content, comments.rating, comments.created_at, comments.author, 
        users.name AS author_name, users.profile_pic AS author_dp 
        FROM comments 
        JOIN users ON comments.author = users.id   
        WHERE comments.id IN (${placeholders}) 
        ORDER BY comments.created_at DESC 
        LIMIT ? OFFSET ?`
,
        [...commentIds, limit, offset],
        (err, comments) => {
          if (err) return res.status(500).json({ error: err.message });
          
          return res.status(200).json({
            data: comments,
            total: commentIds.length,
            page: parseInt(page) || 1,
            totalPages: Math.ceil(commentIds.length / limit),
          });
        }
      );
    });
  } catch (error) {
    console.error("Error fetching comments:", error.message);
    return res.status(500).json({ error: "Internal server error occurred" });
  }
};

const Delete_Comment_Controller=async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    db.get("SELECT author, recipe_id FROM comments WHERE id = ?", [commentId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Comment not found" });
      if (row.author !== userId) return res.status(403).json({ error: "Unauthorized to delete this comment" });
      
      db.run("DELETE FROM comments WHERE id = ?", [commentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get("SELECT comments FROM recipes WHERE id = ?", [row.recipe_id], (err, recipeRow) => {
          if (err) return res.status(500).json({ error: err.message });
          
          let updatedComments = [];
          try {
            updatedComments = recipeRow && recipeRow.comments ? JSON.parse(recipeRow.comments) : [];
          } catch {
            updatedComments = [];
          }
          
          updatedComments = updatedComments.filter(id => id !== parseInt(commentId));
          
          db.run("UPDATE recipes SET comments = ? WHERE id = ?", [JSON.stringify(updatedComments), row.recipe_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.status(200).json({ msg: "Comment deleted successfully",totalPages: Math.ceil(updatedComments.length / 10), });
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports={
    Post_Comment_Controller,
    Get_Comments_Controller,
    Delete_Comment_Controller,
}