const jwt = require("jsonwebtoken");

const { User, Role } = require("../models");

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization token is required."
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message:
                    "Authorization header must use Bearer token."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findByPk(decoded.id, {
            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["id", "name"]
                }
            ]
        });

        if (!user) {
            return res.status(401).json({
                message: "User no longer exists."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: "Account is inactive."
            });
        }

        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

module.exports = authenticate;