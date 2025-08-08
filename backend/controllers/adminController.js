const Property = require('../models/Property');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Owner = require('../models/Owner');
const { PROPERTY_STATUS, BOOKING_STATUS } = require('../utils/constants');

// Approve/reject property
const reviewProperty = async (req, res) => {
  const { status } = req.body;

  try {
    if (![PROPERTY_STATUS.APPROVED, PROPERTY_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Invalid status. Must be either APPROVED or REJECTED'
        },
        data: null
      });
    }

    const property = await Property.findById(req.params.id).populate('owner');
    if (!property) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Property not found'
        },
        data: null
      });
    }

    property.status = status;
    await property.save();

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: `Property ${status.toLowerCase()} successfully`,
        property: {
          id: property._id,
          title: property.title,
          description: property.description,
          location: property.location,
          rent: property.rent,
          deposit: property.deposit,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          amenities: property.amenities,
          images: property.images,
          status: property.status,
          owner: property.owner,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Review property error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

// Publish property
const publishProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner');
    if (!property) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Property not found'
        },
        data: null
      });
    }

    if (property.status !== PROPERTY_STATUS.APPROVED) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property must be approved first before publishing'
        },
        data: null
      });
    }

    property.status = PROPERTY_STATUS.PUBLISHED;
    await property.save();

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Property published successfully',
        property: {
          id: property._id,
          title: property.title,
          description: property.description,
          location: property.location,
          rent: property.rent,
          deposit: property.deposit,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          amenities: property.amenities,
          images: property.images,
          status: property.status,
          owner: property.owner,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Publish property error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

// Manage site visit requests
const manageSiteVisit = async (req, res) => {
  const { status } = req.body;

  try {
    if (![BOOKING_STATUS.APPROVED, BOOKING_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Invalid status. Must be either APPROVED or REJECTED'
        },
        data: null
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user')
      .populate('property');
    
    if (!booking) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Booking not found'
        },
        data: null
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: `Site visit ${status.toLowerCase()} successfully`,
        booking: {
          id: booking._id,
          user: booking.user,
          property: booking.property,
          visitDate: booking.visitDate,
          status: booking.status,
          message: booking.message,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Manage site visit error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Users retrieved successfully',
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.verified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        totalUsers: users.length
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

// Get all properties for admin
const getAllPropertiesForAdmin = async (req, res) => {
  try {
    const properties = await Property.find({}).populate('owner');

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Properties retrieved successfully',
        properties: properties.map(property => ({
          id: property._id,
          title: property.title,
          description: property.description,
          location: property.location,
          rent: property.rent,
          deposit: property.deposit,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          amenities: property.amenities,
          images: property.images,
          status: property.status,
          owner: property.owner,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        })),
        totalProperties: properties.length,
        statusBreakdown: {
          pending: properties.filter(p => p.status === PROPERTY_STATUS.PENDING).length,
          approved: properties.filter(p => p.status === PROPERTY_STATUS.APPROVED).length,
          published: properties.filter(p => p.status === PROPERTY_STATUS.PUBLISHED).length,
          rejected: properties.filter(p => p.status === PROPERTY_STATUS.REJECTED).length
        }
      }
    });
  } catch (error) {
    console.error('Get all properties for admin error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

// Get all bookings for admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user')
      .populate('property')
      .sort({ createdAt: -1 });

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Bookings retrieved successfully',
        bookings: bookings.map(booking => ({
          id: booking._id,
          user: {
            id: booking.user._id,
            name: booking.user.name,
            email: booking.user.email
          },
          property: {
            id: booking.property._id,
            title: booking.property.title,
            location: booking.property.location,
            rent: booking.property.rent
          },
          visitDate: booking.visitDate,
          status: booking.status,
          message: booking.message,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        })),
        totalBookings: bookings.length,
        statusBreakdown: {
          pending: bookings.filter(b => b.status === BOOKING_STATUS.PENDING).length,
          approved: bookings.filter(b => b.status === BOOKING_STATUS.APPROVED).length,
          rejected: bookings.filter(b => b.status === BOOKING_STATUS.REJECTED).length,
          completed: bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length
        }
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      },
      data: null
    });
  }
};

module.exports = {
  reviewProperty,
  publishProperty,
  manageSiteVisit,
  getAllUsers,
  getAllPropertiesForAdmin,
  getAllBookings
};