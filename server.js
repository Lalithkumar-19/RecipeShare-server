const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const PORT = 5000;
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));
const LoginRouter = require("./Routes/LoginRoutes");
const RecipeRouter = require("./Routes/RecipeRoutes");
const UserRoutes = require("./Routes/UserRoutes");


//routers 

app.use("/api",LoginRouter);
app.use("/api",RecipeRouter);
app.use("/api",UserRoutes);





app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});