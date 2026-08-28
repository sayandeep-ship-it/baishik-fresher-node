const jwt = require("jsonwebtoken");

const {
    User,
    Role,
    UserRole
} = require("../models");


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================
//
// Responsibilities:
//
// 1. Read Bearer token
// 2. Verify JWT
// 3. Find user
// 4. Check account status
// 5. Load current role assignments from user_roles
// 6. Attach authentication information to req.user
//
// IMPORTANT:
//
// JWT contains:
//
// {
//     id: 15,
//     roles: ["user", "vendor"]
// }
//
// But role suspension is ALWAYS checked from the
// database through user_roles.
//
// This prevents a suspended vendor from continuing to
// use vendor APIs merely because an old JWT still contains
// "vendor".
// =====================================================

const authenticate = async (
    req,
    res,
    next
) => {
    try {

        // =================================================
        // 1. READ AUTHORIZATION HEADER
        // =================================================

        const authHeader =
            req.headers.authorization;


        if (!authHeader) {
            return res.status(401).json({
                message:
                    "Authorization token is required."
            });
        }


        // =================================================
        // 2. CHECK BEARER FORMAT
        // =================================================

        if (
            !authHeader.startsWith(
                "Bearer "
            )
        ) {
            return res.status(401).json({
                message:
                    "Authorization header must use Bearer token."
            });
        }


        // =================================================
        // 3. EXTRACT TOKEN
        // =================================================

        const token =
            authHeader.substring(7);
        
    
        if (!token) {
            return res.status(401).json({
                message:
                    "Authorization token is required."
            });
        }
        // SAVE ORIGINAL TOKEN
        req.token = token; 
        // =================================================
        // 4. VERIFY JWT
        // =================================================

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

        } catch (jwtError) {

            return res.status(401).json({
                message:
                    "Invalid or expired token."
            });
        }


        // =================================================
        // 5. BASIC JWT VALIDATION
        // =================================================

        if (
            !decoded.id ||
            !Array.isArray(
                decoded.roles
            )
        ) {
            return res.status(401).json({
                message:
                    "Invalid authentication token."
            });
        }


        // =================================================
        // 6. FIND USER
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
        // 7. CHECK ACCOUNT STATUS
        // =================================================
        //
        // This is different from role suspension.
        //
        // users.isActive
        //      =
        // account-level authentication status
        //
        // user_roles.suspended
        //      =
        // individual role status
        //
        // =================================================

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Account is inactive."
            });
        }


        // =================================================
        // 8. LOAD ROLE ASSIGNMENTS
        // =================================================
        //
        // IMPORTANT:
        //
        // We do NOT use decoded.roles as the database
        // authority.
        //
        // We load current roles from user_roles.
        //
        // =================================================

        const roleAssignments =
            await UserRole.findAll({
                where: {
                    userId:
                        user.id
                },

                include: [
                    {
                        model:
                            Role,

                        as:
                            "role",

                        attributes: [
                            "id",
                            "name"
                        ]
                    }
                ]
            });


        // =================================================
        // 9. NO ROLE ASSIGNMENTS
        // =================================================

        if (
            !roleAssignments.length
        ) {
            return res.status(403).json({
                message:
                    "No role is assigned to this account."
            });
        }


        // =================================================
        // 10. BUILD CURRENT ROLE DATA
        // =================================================

        const roleAssignmentsData =
            roleAssignments.map(
                (assignment) => {

                    return {
                        id:
                            assignment.role.id,

                        name:
                            assignment.role.name,

                        suspended:
                            Boolean(
                                assignment.suspended
                            )
                    };
                }
            );


        // =================================================
        // 11. BUILD ACTIVE ROLES
        // =================================================
        //
        // Only roles with:
        //
        // suspended = false
        //
        // are considered active.
        //
        // =================================================

        const activeRoles =
            roleAssignmentsData
                .filter(
                    (assignment) =>
                        !assignment.suspended
                )
                .map(
                    (assignment) =>
                        assignment.name
                );


        // =================================================
        // 12. VERIFY JWT ROLE CONSISTENCY
        // =================================================
        //
        // The JWT may have been generated earlier.
        //
        // We therefore do NOT trust its role list for
        // authorization.
        //
        // The database is authoritative.
        //
        // =================================================


        // =================================================
        // 13. ATTACH USER TO REQUEST
        // =================================================

        req.user =
            user;


        // =================================================
        // 14. ATTACH JWT ROLES
        // =================================================
        //
        // This preserves exactly what the JWT contained:
        //
        // ["user", "vendor"]
        //
        // =================================================

        req.user.jwtRoles =
            decoded.roles;


        // =================================================
        // 15. ATTACH CURRENT ACTIVE ROLES
        // =================================================
        //
        // These values come from user_roles.
        //
        // =================================================

        req.user.roles =
            activeRoles;


        // =================================================
        // 16. ATTACH FULL ROLE ASSIGNMENTS
        // =================================================
        //
        // Example:
        //
        // [
        //     {
        //         id: 1,
        //         name: "user",
        //         suspended: false
        //     },
        //     {
        //         id: 2,
        //         name: "vendor",
        //         suspended: true
        //     }
        // ]
        //
        // =================================================

        req.user.roleAssignments =
            roleAssignmentsData;


        // =================================================
        // 17. CONTINUE
        // =================================================

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