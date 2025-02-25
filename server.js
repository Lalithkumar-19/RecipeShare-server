const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors()); 

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow any origin
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json());

const LoginRouter = require("./Routes/LoginRoutes");
const RecipeRouter = require("./Routes/RecipeRoutes");
const UserRoutes = require("./Routes/UserRoutes");

app.use("/api", LoginRouter);
app.use("/api", RecipeRouter);
app.use("/api", UserRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
