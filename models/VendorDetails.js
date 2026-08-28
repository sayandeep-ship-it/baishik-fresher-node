const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VendorDetails = sequelize.define(
    "VendorDetails",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: "user_id"
        },

        hasAddress: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "has_address"
        },

        streetAddress: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "street_address"
        },

        city: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        country: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        state: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        pinCode: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: "pin_code"
        },

        storeName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "store_name"
        },

        storeType: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "store_type"
        },

        image: {
            type: DataTypes.STRING(500),
            allowNull: true
        }
    },
    {
        tableName: "vendor_details",
        timestamps: true
    }
);

module.exports = VendorDetails;