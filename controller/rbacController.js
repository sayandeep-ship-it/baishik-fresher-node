const { User, Role } = require("../models");

exports.changeUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({
                message: "Role is required."
            });
        }

        const allowedRoles = [
            "user",
            "vendor",
            "superadmin"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message:
                    "Invalid role. Allowed roles: user, vendor, superadmin."
            });
        }

        const targetUser = await User.findByPk(userId);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const roleRecord = await Role.findOne({
            where: {
                name: role
            }
        });

        if (!roleRecord) {
            return res.status(404).json({
                message: "Role not found."
            });
        }

        targetUser.roleId = roleRecord.id;

        await targetUser.save();

        return res.status(200).json({
            message: "User role updated successfully.",

            user: {
                id: targetUser.id,
                email: targetUser.email,
                roleId: roleRecord.id,
                role: roleRecord.name
            }
        });

    } catch (error) {
        console.error("Change role error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};