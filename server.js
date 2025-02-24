const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const PORT = process.env.PORT || 5000; // Ensure PORT is always defined

const app = express();

// Allow all origins (CORS policy)
app.use(cors({
    origin: "https://recipe-share-frontend-ten.vercel.app",
    credentials: true, // Allow cookies & authentication headers
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));


// Middleware
app.use(express.json());

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
