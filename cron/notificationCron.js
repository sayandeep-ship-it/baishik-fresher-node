const cron = require('node-cron');
const { Op } = require('sequelize');
const {
  UserVendorEnrollment,
  UserLoyaltyEnrollment,
  LoyaltyProgram,
  UserNotification,
  User,
} = require('../models');

const runNotificationCheck = async () => {
  try {
    console.log('[NotificationCron] Running notification check...');

    // Get all vendor enrollments with their user data
    const enrollments = await UserVendorEnrollment.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          where: { isActive: true },
        },
      ],
    });

    let notificationsCreated = 0;

    for (const enrollment of enrollments) {
      const userId = enrollment.userId;
      const vendorId = enrollment.vendorId;
      const starsCollected = enrollment.starsCollected;

      if (starsCollected <= 0) {
        continue;
      }

      // Find all active loyalty programs from this vendor where the user has enough stars
      const qualifyingPrograms = await LoyaltyProgram.findAll({
        where: {
          vendorId,
          isActive: true,
          requiredStarCollection: {
            [Op.lte]: starsCollected,
          },
        },
      });

      for (const program of qualifyingPrograms) {
        // Check if the user is actually enrolled in this program
        const loyaltyEnrollment = await UserLoyaltyEnrollment.findOne({
          where: {
            userId,
            loyaltyProgramId: program.id,
          },
        });

        if (!loyaltyEnrollment) {
          continue;
        }

        // Check if notification was already sent for this (user, program)
        const existingNotification = await UserNotification.findOne({
          where: {
            userId,
            loyaltyProgramId: program.id,
          },
        });

        if (existingNotification) {
          // Already notified — skip to prevent message bombing
          continue;
        }

        // Create the notification
        try {
          await UserNotification.create({
            userId,
            loyaltyProgramId: program.id,
            vendorId,
            starsAtNotification: starsCollected,
            message: `Congratulations! You have earned ${starsCollected} stars and can now redeem "${program.programName}" (requires ${program.requiredStarCollection} stars).`,
            isRead: false,
          });

          notificationsCreated++;
          console.log(
            `[NotificationCron] Notification created for user ${userId}, program "${program.programName}" (id: ${program.id})`
          );
        } catch (createError) {
          // Unique constraint violation — another process already created it
          if (
            createError.name === 'SequelizeUniqueConstraintError'
          ) {
            continue;
          }
          console.error(
            `[NotificationCron] Error creating notification for user ${userId}, program ${program.id}:`,
            createError
          );
        }
      }
    }

    console.log(
      `[NotificationCron] Check complete. ${notificationsCreated} new notification(s) created.`
    );
  } catch (error) {
    console.error('[NotificationCron] Error running notification check:', error);
  }
};


const startNotificationCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runNotificationCheck();
  });

  console.log('[NotificationCron] Cron job scheduled (every 5 minutes).');

  // Also run once at startup after a short delay
  setTimeout(() => {
    runNotificationCheck();
  }, 5000);
};

module.exports = {
  startNotificationCron,
  runNotificationCheck,
};
