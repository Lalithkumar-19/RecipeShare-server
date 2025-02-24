const db = require("../utils/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const Update_UserProfile_Controller= async (req, res) => {
    console.log("API called");

    try {
      const { id } = req.user;
      const {image} = req.body;
      if (!id || !image) {
        return res.status(400).json({ msg: "Invalid request. Image and user ID required." });
      }

      const result = await new Promise((resolve, reject) => {
        const query = `UPDATE users SET profile_pic=? WHERE id=?`;
        db.run(query, [image, id], (err) => {
          if (err) {
            return reject(err);
          }
          resolve(image);
        });
      });
      console.log(result,"c");

      return res.status(200).json(result);

    } catch (error) {
      console.error("Error updating DP:", error);
      return res.status(500).json({ msg: "An error occurred", error });
    }
  };


  const Update_UserName_Controller=async (req, res) => {
    console.log("API 2 called");

    try {
      const { id } = req.user;
      const { name } = req.body;
      if (!id || !name) {
        return res.status(400).json({ msg: "Invalid request. Image and user ID required." });
      }

      const result = await new Promise((resolve, reject) => {
        const query = `UPDATE users SET name=? WHERE id=?`;
        db.all(query, [name, id], (err) => {
          if (err) {
            return reject(err);
          }
          resolve(name);
        });
      });

      return res.status(200).json(result);

    } catch (error) {
      console.error("Error updating name:", error);
      return res.status(500).json({ msg: "An error occurred", error });
    }
  };

module.exports={
Update_UserProfile_Controller,
Update_UserName_Controller

}



