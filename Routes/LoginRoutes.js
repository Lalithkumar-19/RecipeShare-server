const { LoginWithEmail_Controller, SignUp_Controler, Login_With_Google, Forgot_Password_Controller, Reset_password_Controller } = require("../Controllers/Logincontrollers");
const { Get_All_Recipes_Controller } = require("../Controllers/Recipescontrollers");

const LoginRouter=require("express").Router();


LoginRouter.post("/login",LoginWithEmail_Controller);
LoginRouter.post("/signup",SignUp_Controler);
LoginRouter.post("/google-login",Login_With_Google);
LoginRouter.post("forgot-password",Forgot_Password_Controller);
LoginRouter.post("/reset-password",Reset_password_Controller);

module.exports=LoginRouter;


