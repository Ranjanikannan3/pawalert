const Notification = require('../models/Notification');

/**
 * Dispatch an in-app notification to specific users or roles
 */
async function dispatchNotification({
  recipientRole = 'all',
  userId = null,
  type,
  title,
  message,
  relatedReportId = null,
  relatedHotspotId = null,
  metadata = {},
  isDemo = false,
}) {
  try {
    const notification = await Notification.create({
      recipientRole,
      userId,
      type,
      title,
      message,
      relatedReportId,
      relatedHotspotId,
      metadata,
      isDemo,
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}


module.exports = {
  dispatchNotification,
};
