const multer = require("multer");
const { Post_Comment_Controller, Get_Comments_Controller, Delete_Comment_Controller } = require("../Controllers/CommenthandlingControllers");
const { Update_UserProfile_Controller, Update_UserName_Controller } = require("../Controllers/UserProfilecontrollers");
const { Uploadmiddleware } = require("../middlewares/Imageuploader");
const { UserAuth } = require("../middlewares/UserAuth");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const UserRoutes=require("express").Router();
UserRoutes.post(
  "/updateUserdp",
  UserAuth,
  upload.single("image"),
  Uploadmiddleware,Update_UserProfile_Controller);



UserRoutes.post(
  "/updateUserName",
  UserAuth,Update_UserName_Controller);
  



UserRoutes.post("/comments", UserAuth, Post_Comment_Controller);

UserRoutes.get("/comments", Get_Comments_Controller);

UserRoutes.delete("/comments/:id", UserAuth, Delete_Comment_Controller);


module.exports=UserRoutes;