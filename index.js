const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

require("dotenv").config();

const sequelize = require("./config/database");

const { connectDatabase } = require("./config/database");

const { verifySMTPConnection } = require("./services/emailService");

require("./models");

const apiRoutes = require("./routes/api");


const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(morgan("dev"));

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*"
    })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.redirect("/health");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running."
    });
});


// =====================================================
// API ROUTES
// =====================================================

app.use("/api", apiRoutes); //3000/api


// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found."
    });
});


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        message: "Internal server error."
    });
});


// =====================================================
// START SERVER
// =====================================================

const PORT = Number(process.env.PORT || 3000);

const HOST = process.env.HOST || "127.0.0.1";

const startServer = async () => {
    try {
        await connectDatabase();

        await verifySMTPConnection();

        app.listen(PORT, HOST, () => {
            console.log(
                `Server running at http://${HOST}:${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "Unable to start server:",
            error.message
        );

        process.exit(1);
    }
};

startServer();