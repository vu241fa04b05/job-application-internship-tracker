
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Import routes and authentication
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");
const authMiddleware = require("./middleware/auth");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// API routes
app.use("/api/auth", authRoutes);

// Protect application routes
app.use("/api/applications", authMiddleware, applicationRoutes);

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI || !JWT_SECRET) {
    console.error("Missing MONGODB_URI or JWT_SECRET.");
    process.exit(1);
}

// Start server
async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
