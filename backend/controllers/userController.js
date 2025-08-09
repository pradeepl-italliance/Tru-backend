const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Wishlist = require('../models/Wishlist');
const { PROPERTY_STATUS, BOOKING_STATUS } = require('../utils/constants');

// Get all published properties
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: PROPERTY_STATUS.PUBLISHED })
      .populate('owner')
      .sort({ createdAt: -1 });

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
          owner: property.owner ? {
            id: property.owner._id,
            name: property.owner.name,
            phone: property.owner.phone
          } : null,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        })),
        totalProperties: properties.length
      }
    });
  } catch (error) {
    console.error('Get all properties error:', error);
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

const getPropertyById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id; // assuming req.user is populated by authentication middleware

  try {
    // Fetch property
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: { message: 'Property not found' },
        data: null
      });
    }

    // Fetch bookings for this property
    const bookings = await Booking.find({
      property: id,
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] }
    });

    // Check if current user has booked it
    const userHasBooking = bookings.some(
      booking => booking.user.toString() === userId?.toString()
    );

    // List all booked slots (time + date)
    const bookedSlots = bookings.map(b => ({
      date: b.date,
      timeSlot: b.timeSlot,
      bookedByCurrentUser: b.user.toString() === userId?.toString()
    }));

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Property retrieved successfully',
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
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        },
        bookingInfo: {
          userHasBooking,
          bookedSlots
        }
      }
    });

  } catch (error) {
    console.error('Get property by ID error:', error);
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

// Add property to wishlist
const addToWishlist = async (req, res) => {
  const { propertyId } = req.body;

  try {
    if (!propertyId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property ID is required'
        },
        data: null
      });
    }

    // Check if property exists and is published
    const property = await Property.findById(propertyId);
    if (!property || property.status !== PROPERTY_STATUS.PUBLISHED) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Property not found or not available'
        },
        data: null
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    let isNewProperty = true;
    
    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        properties: [propertyId]
      });
    } else {
      if (!wishlist.properties.includes(propertyId)) {
        wishlist.properties.push(propertyId);
      } else {
        isNewProperty = false;
      }
    }

    await wishlist.save();
    await wishlist.populate('properties');

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: isNewProperty ? 'Property added to wishlist successfully' : 'Property already in wishlist',
        wishlist: {
          id: wishlist._id,
          user: wishlist.user,
          properties: wishlist.properties.map(prop => ({
            id: prop._id,
            title: prop.title,
            location: prop.location,
            rent: prop.rent,
            images: prop.images
          })),
          totalItems: wishlist.properties.length
        },
        isNewProperty
      }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
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

// Book site visit
const bookSiteVisit = async (req, res) => {
  const { propertyId, visitDate, message } = req.body;

  try {
    if (!propertyId || !visitDate) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property ID and visit date are required'
        },
        data: null
      });
    }

    const property = await Property.findById(propertyId);
    if (!property || property.status !== PROPERTY_STATUS.PUBLISHED) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Property not found or not available for booking'
        },
        data: null
      });
    }

    // Check if user already has a pending booking for this property
    const existingBooking = await Booking.findOne({
      user: req.user._id,
      property: propertyId,
      status: BOOKING_STATUS.PENDING
    });

    if (existingBooking) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'You already have a pending site visit request for this property'
        },
        data: null
      });
    }

    const booking = new Booking({
      user: req.user._id,
      property: propertyId,
      visitDate,
      message: message || '',
      status: BOOKING_STATUS.PENDING
    });

    await booking.save();
    await booking.populate(['user', 'property']);

    res.status(201).json({
      statusCode: 201,
      success: true,
      error: null,
      data: {
        message: 'Site visit booked successfully',
        booking: {
          id: booking._id,
          user: {
            id: booking.user._id,
            name: booking.user.name,
            email: booking.user.email
          },
          property: {
            id: booking.property._id,
            title: booking.property.title,
            location: booking.property.location
          },
          visitDate: booking.visitDate,
          status: booking.status,
          message: booking.message,
          createdAt: booking.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Book site visit error:', error);
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

// Unlock owner contact
const unlockOwnerContact = async (req, res) => {
  const { propertyId } = req.body;

  try {
    if (!propertyId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property ID is required'
        },
        data: null
      });
    }

    const property = await Property.findById(propertyId).populate({
      path: 'owner',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    });

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

    if (property.status !== PROPERTY_STATUS.PUBLISHED) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property is not available'
        },
        data: null
      });
    }

    // Mock payment processing
    // In a real app, you would integrate with a payment gateway here
    const paymentSuccessful = true; // Mock payment success

    if (paymentSuccessful) {
      res.status(200).json({
        statusCode: 200,
        success: true,
        error: null,
        data: {
          message: 'Owner contact unlocked successfully',
          ownerContact: {
            name: property.owner.user.name,
            email: property.owner.user.email,
            phone: property.owner.user.phone || property.owner.phone
          },
          property: {
            id: property._id,
            title: property.title,
            location: property.location
          }
        }
      });
    } else {
      res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Payment processing failed. Please try again.'
        },
        data: null
      });
    }
  } catch (error) {
    console.error('Unlock owner contact error:', error);
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

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
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
          property: {
            id: booking.property._id,
            title: booking.property.title,
            location: booking.property.location,
            rent: booking.property.rent,
            images: booking.property.images
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
    console.error('Get user bookings error:', error);
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

// Get user wishlist
const getUserWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('properties');

    const wishlistData = wishlist ? {
      id: wishlist._id,
      user: wishlist.user,
      properties: wishlist.properties.map(property => ({
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
        createdAt: property.createdAt
      })),
      totalItems: wishlist.properties.length,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt
    } : {
      properties: [],
      totalItems: 0
    };

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Wishlist retrieved successfully',
        wishlist: wishlistData
      }
    });
  } catch (error) {
    console.error('Get user wishlist error:', error);
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

// Remove property from wishlist
const removeFromWishlist = async (req, res) => {
  const { propertyId } = req.body;

  try {
    if (!propertyId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: 'Property ID is required'
        },
        data: null
      });
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Wishlist not found'
        },
        data: null
      });
    }

    const propertyIndex = wishlist.properties.indexOf(propertyId);
    if (propertyIndex === -1) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: {
          message: 'Property not found in wishlist'
        },
        data: null
      });
    }

    wishlist.properties.splice(propertyIndex, 1);
    await wishlist.save();
    await wishlist.populate('properties');

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Property removed from wishlist successfully',
        wishlist: {
          id: wishlist._id,
          user: wishlist.user,
          properties: wishlist.properties.map(prop => ({
            id: prop._id,
            title: prop.title,
            location: prop.location,
            rent: prop.rent,
            images: prop.images
          })),
          totalItems: wishlist.properties.length
        }
      }
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
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
  getAllProperties,
  addToWishlist,
  removeFromWishlist,
  bookSiteVisit,
  unlockOwnerContact,
  getUserBookings,
  getUserWishlist,
  getPropertyById
};