const jwt = require("jsonwebtoken");

const {
    User,
    Role,
    UserRole
} = require("../models");


const authenticate = async (
    req,
    res,
    next
) => {
    try {
        // =================================================
        // READ AUTHORIZATION HEADER
        // =================================================

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message:
                    "Authorization token is required."
            });
        }

        if (
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                message:
                    "Authorization header must use Bearer token."
            });
        }

        const token =
            authHeader.split(" ")[1];


        // =================================================
        // VERIFY JWT
        // =================================================

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findByPk(
                decoded.id
            );

        if (!user) {
            return res.status(401).json({
                message:
                    "User no longer exists."
            });
        }


        // =================================================
        // ACCOUNT STATUS
        // =================================================

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Account is inactive."
            });
        }


        // =================================================
        // LOAD USER ROLES FROM JUNCTION TABLE
        // =================================================

        const roleAssignments =
            await UserRole.findAll({
                where: {
                    userId: user.id
                },

                include: [
                    {
                        model: Role,
                        as: "role",
                        attributes: [
                            "id",
                            "name"
                        ]
                    }
                ]
            });


        // =================================================
        // ROLE INFORMATION
        // =================================================

        const roles =
            roleAssignments.map(
                assignment => ({
                    id:
                        assignment.role.id,

                    name:
                        assignment.role.name,

                    suspended:
                        assignment.suspended
                })
            );


        // =================================================
        // JWT ROLES
        // =================================================

        const jwtRoles =
            roles.map(
                role => role.name
            );


        // =================================================
        // ATTACH USER TO REQUEST
        // =================================================

        req.user = user;

        req.user.roles =
            jwtRoles;

        req.user.roleAssignments =
            roles;


        next();

    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );

        return res.status(401).json({
            message:
                "Invalid or expired token."
        });
    }
};


module.exports = authenticate;