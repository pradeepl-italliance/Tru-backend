const Booking = require('../models/Booking');
const { ROLES, BOOKING_STATUS } = require('../utils/constants');

// Create a booking (User only)
exports.createBooking = async (req, res) => {
  try {
    if (req.user.role !== ROLES.USER) {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        error: { message: 'Only users can book properties' },
        data: null
      });
    }

    const { property, date, timeSlot } = req.body;
    if (!property || !date || !timeSlot) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: 'Property, date, and time slot are required' },
        data: null
      });
    }

    const booking = new Booking({
      user: req.user._id,
      property,
      date,
      timeSlot
    });

    await booking.save();

    return res.status(201).json({
      statusCode: 201,
      success: true,
      error: null,
      data: booking
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};

// Admin updates booking status (approve/reject/complete)
exports.updateBookingStatus = async (req, res) => {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        error: { message: 'Only admins can update booking status' },
        data: null
      });
    }

    const { status } = req.body;
    const validStatuses = [
      BOOKING_STATUS.APPROVED,
      BOOKING_STATUS.REJECTED,
      BOOKING_STATUS.COMPLETED
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: 'Invalid booking status' },
        data: null
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: { message: 'Booking not found' },
        data: null
      });
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: booking
    });
  } catch (err) {
    console.error('Update booking status error:', err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};

// Get bookings (User sees own, Admin sees all) with totals
exports.getBookings = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === ROLES.USER) {
      filter.user = req.user._id;
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('property', 'title location');

    const totalBookings = await Booking.countDocuments(filter);

    const totalByStatus = await Booking.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = totalByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        totalBookings,
        totalByStatus: statusCounts,
        bookings
      }
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};

// User updates booking time (resets to pending)
exports.updateBookingTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timeSlot } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: { message: 'Booking not found' },
        data: null
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        error: { message: 'Not authorized to update this booking' },
        data: null
      });
    }

    booking.date = date || booking.date;
    booking.timeSlot = timeSlot || booking.timeSlot;
    booking.status = BOOKING_STATUS.PENDING;

    await booking.save();

    return res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking time:', error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};

// Get all bookings for admin with totals
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email role')
      .populate('property', 'title location');

    const totalBookings = await Booking.countDocuments();

    const totalByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = totalByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        totalBookings,
        totalByStatus: statusCounts,
        bookings
      }
    });
  } catch (err) {
    console.error('Get all bookings error:', err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};

// Admin analytics endpoint
exports.getBookingAnalytics = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();

    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const bookingsByUserRole = await Booking.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $group: {
          _id: '$userDetails.role',
          count: { $sum: 1 }
        }
      }
    ]);

    const topProperties = await Booking.aggregate([
      {
        $group: {
          _id: '$property',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'propertyDetails'
        }
      },
      { $unwind: '$propertyDetails' },
      {
        $project: {
          _id: 0,
          propertyId: '$_id',
          title: '$propertyDetails.title',
          bookingsCount: '$count'
        }
      }
    ]);

    const statusCounts = bookingsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const roleCounts = bookingsByUserRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        totalBookings,
        bookingsByStatus: statusCounts,
        bookingsByUserRole: roleCounts,
        topProperties
      }
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Server error' },
      data: null
    });
  }
};
