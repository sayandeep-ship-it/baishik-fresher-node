const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                message: "Role information is missing."
            });
        }

        const userRole = req.user.role.name;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                message:
                    "You do not have permission to access this resource."
            });
        }

        next();
    };
};

module.exports = authorizeRoles;