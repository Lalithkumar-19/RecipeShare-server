const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

// Allow all origins (CORS policy)
app.use(cors({
    origin: "https://recipe-share-frontend-ten.vercel.app",
    credentials: true,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

app.use(express.json());

// Ensure Google login route handles CORS properly
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://recipe-share-frontend-ten.vercel.app");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    
    next();
});

// Routes
const LoginRouter = require("./Routes/LoginRoutes");
const RecipeRouter = require("./Routes/RecipeRoutes");
const UserRoutes = require("./Routes/UserRoutes");

app.use("/api", LoginRouter);
app.use("/api", RecipeRouter);
app.use("/api", UserRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
