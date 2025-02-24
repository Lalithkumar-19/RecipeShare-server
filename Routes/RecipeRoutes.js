const { Upload_Recipe_Controller, Get_Single_Recipe_Controller, Get_Filtered_Recipes_Controller, Get_All_Recipes_Controller } = require("../Controllers/Recipescontrollers");
const { Get_Fav_Recipes_Controller, Save_Recipe_Controller, Remove_From_Saved_Controller, Delete_Recipe_Controller, Get_PostedRecipes_Controller, Generate_Recipe_Controller, Get_FavRecipes_List_Controller } = require("../Controllers/UserActionControllers");
const { Uploadmiddleware } = require("../middlewares/Imageuploader");
const { UserAuth } = require("../middlewares/UserAuth");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const RecipeRouter=require("express").Router();

RecipeRouter.get
RecipeRouter.get("/recipes",Get_All_Recipes_Controller);

RecipeRouter.get("/getFiltered",Get_Filtered_Recipes_Controller);

RecipeRouter.get("/recipes/:id", Get_Single_Recipe_Controller);

RecipeRouter.post(
  "/recipes",
  UserAuth,
  upload.single("image"),
  Uploadmiddleware,
 Upload_Recipe_Controller);



RecipeRouter.get("/getFavRecipes",Get_Fav_Recipes_Controller);

RecipeRouter.post("/saveRecipe", Save_Recipe_Controller);

RecipeRouter.put("/removeFromSaved", Remove_From_Saved_Controller);



RecipeRouter.delete("/deleteRecipe", UserAuth,Delete_Recipe_Controller);

RecipeRouter.get("/getFavRecipeslist",Get_FavRecipes_List_Controller);

RecipeRouter.get("/getpostedRecipes",Get_PostedRecipes_Controller);

RecipeRouter.get("/generateRecipe",Generate_Recipe_Controller);



module.exports=RecipeRouter;