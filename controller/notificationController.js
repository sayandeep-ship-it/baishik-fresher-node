

const {
  UserNotification,
  LoyaltyProgram,
  User,
  VendorDetails,
} = require('../models');


// GET USER NOTIFICATIONS


exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await UserNotification.findAll({
      where: { userId },
      include: [
        {
          model: LoyaltyProgram,
          as: 'loyaltyProgram',
          attributes: [
            'id',
            'programName',
            'requiredStarCollection',
            'image',
            'vendorId',
          ],
          include: [
            {
              model: User,
              as: 'vendor',
              attributes: ['id', 'firstName', 'lastName'],
              include: [
                {
                  model: VendorDetails,
                  as: 'vendorDetails',
                  attributes: ['storeName', 'storeType', 'image'],
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully.',
      count: notifications.length,
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        starsAtNotification: n.starsAtNotification,
        isRead: n.isRead,
        createdAt: n.createdAt,
        loyaltyProgram: n.loyaltyProgram
          ? {
            id: n.loyaltyProgram.id,
            programName: n.loyaltyProgram.programName,
            requiredStarCollection: n.loyaltyProgram.requiredStarCollection,
            image: n.loyaltyProgram.image,
            vendor: n.loyaltyProgram.vendor
              ? {
                id: n.loyaltyProgram.vendor.id,
                name: [
                  n.loyaltyProgram.vendor.firstName,
                  n.loyaltyProgram.vendor.lastName,
                ]
                  .filter(Boolean)
                  .join(' '),
                storeName:
                  n.loyaltyProgram.vendor.vendorDetails?.storeName || null,
              }
              : null,
          }
          : null,
      })),
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// MARK NOTIFICATION AS READ


exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        message: 'A valid notification id is required.',
      });
    }

    const notification = await UserNotification.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found.',
      });
    }

    if (notification.isRead) {
      return res.status(200).json({
        success: true,
        message: 'Notification is already marked as read.',
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
