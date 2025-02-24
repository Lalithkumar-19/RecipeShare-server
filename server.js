const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const PORT = process.env.PORT||5000;
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: 
  "https://recipe-share-frontend-ten.vercel.app" }));
const LoginRouter = require("./Routes/LoginRoutes");
const RecipeRouter = require("./Routes/RecipeRoutes");
const UserRoutes = require("./Routes/UserRoutes");


//routers 

app.use("/api",LoginRouter);
app.use("/api",RecipeRouter);
app.use("/api",UserRoutes);





app.listen(process.env.PORT, () => {
  console.log(`Server is running on ${PORT}`);
});