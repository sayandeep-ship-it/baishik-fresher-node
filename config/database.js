const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD || "",
    {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: process.env.DB_DIALECT || "mysql",

        logging: false,

        dialectOptions:
            process.env.DB_SSL === "true"
                ? {
                      ssl: {
                          require: true,
                          rejectUnauthorized: false
                      }
                  }
                : {},

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("MySQL database connected successfully.");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        throw error;
    }
};

module.exports = sequelize;
module.exports.connectDatabase = connectDatabase;