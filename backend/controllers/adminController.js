const mongoose = require('mongoose');
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
const updatePropertyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Allow only valid statuses
    if (!status || ![PROPERTY_STATUS.PUBLISHED, PROPERTY_STATUS.SOLD, PROPERTY_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: 'Invalid status update' },
        data: null
      });
    }

    const property = await Property.findById(req.params.id)
    if (!property) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: { message: 'Property not found' },
        data: null
      });
    }

    // Prevent redundant updates
    if (property.status === status) {
      return res.status(200).json({
        statusCode: 200,
        success: true,
        error: null,
        data: {
          message: `Property is already marked as ${status.toLowerCase()}`,
          property
        }
      });
    }

    // Status transition rules
    if (status === PROPERTY_STATUS.PUBLISHED && property.status !== PROPERTY_STATUS.APPROVED) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: 'Only approved properties can be published' },
        data: null
      });
    }

    if (status === PROPERTY_STATUS.SOLD && property.status !== PROPERTY_STATUS.PUBLISHED) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: 'Only published properties can be marked as sold' },
        data: null
      });
    }

    // REJECTED is always allowed, no condition needed
    property.status = status;
    await property.save();

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: `Property marked as ${status.toLowerCase()} successfully`,
        property
      }
    });
  } catch (error) {
    console.error('Update property status error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: 'Internal server error', details: error.message },
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
    const { 
      propertyId, 
      customerEmail, 
      customerName, 
      customerPhone,
      status,
      propertyType,
      minRent,
      maxRent,
      bedrooms,
      bathrooms,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const allowedSortFields = ['createdAt', 'updatedAt', 'rent', 'title'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Build property filters
    let propertyFilters = {};
    
    // Property ID filter (exact match)
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyFilters._id = propertyId;
    }

    // Status filter
    if (status && Object.values(PROPERTY_STATUS).includes(status)) {
      propertyFilters.status = status;
    }

    // Property type filter
    if (propertyType) {
      propertyFilters.propertyType = new RegExp(propertyType, 'i');
    }

    // Rent range filter
    if (minRent || maxRent) {
      propertyFilters.rent = {};
      if (minRent && !isNaN(minRent)) {
        propertyFilters.rent.$gte = parseInt(minRent);
      }
      if (maxRent && !isNaN(maxRent)) {
        propertyFilters.rent.$lte = parseInt(maxRent);
      }
    }

    // Bedrooms filter
    if (bedrooms && !isNaN(bedrooms)) {
      propertyFilters.bedrooms = parseInt(bedrooms);
    }

    // Bathrooms filter
    if (bathrooms && !isNaN(bathrooms)) {
      propertyFilters.bathrooms = parseInt(bathrooms);
    }

    // Build user filters for aggregation
    let userMatchStage = {};
    if (customerEmail) {
      userMatchStage.email = new RegExp(customerEmail, 'i'); // Case-insensitive partial match
    }
    if (customerPhone) {
      userMatchStage.phone = new RegExp(customerPhone, 'i'); // Partial match
    }
    if (customerName) {
      userMatchStage.$or = [
        { firstName: new RegExp(customerName, 'i') },
        { lastName: new RegExp(customerName, 'i') },
        { name: new RegExp(customerName, 'i') },
        { 
          $expr: { 
            $regexMatch: { 
              input: { $concat: ['$firstName', ' ', '$lastName'] }, 
              regex: customerName, 
              options: 'i' 
            } 
          } 
        }
      ];
    }

    // Use aggregation for better performance when filtering by user data
    const hasUserFilters = customerEmail || customerPhone || customerName;
    
    let properties, totalCount;

    if (hasUserFilters) {
      // Use aggregation pipeline for complex user filtering
      const pipeline = [
        { $match: propertyFilters },
        {
          $lookup: {
            from: 'owners', // Adjust collection name as needed
            localField: 'owner',
            foreignField: '_id',
            as: 'ownerData'
          }
        },
        { $unwind: { path: '$ownerData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerData.user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
        ...(Object.keys(userMatchStage).length > 0 ? [{ $match: { 'userData': userMatchStage } }] : []),
        { $sort: { [sortField]: sortDirection } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limitNum }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const result = await Property.aggregate(pipeline);
      properties = result[0].data;
      totalCount = result[0].totalCount[0]?.count || 0;

      // Populate the aggregated results properly
      properties = properties.map(prop => ({
        ...prop,
        owner: prop.ownerData ? {
          ...prop.ownerData,
          user: prop.userData || null
        } : null
      }));
    } else {
      // Use regular find with population for better performance when no user filters
      const countPromise = Property.countDocuments(propertyFilters);
      const propertiesPromise = Property.find(propertyFilters)
        .populate({
          path: 'owner',
          populate: {
            path: 'user',
            model: 'User',
            select: 'firstName lastName name email phone verified role'
          }
        })
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum);

      [totalCount, properties] = await Promise.all([countPromise, propertiesPromise]);
    }

    // Calculate status breakdown efficiently
    const statusBreakdownPipeline = [
      { $match: hasUserFilters ? {} : propertyFilters }, // Apply same filters for consistency
      ...(hasUserFilters ? [
        {
          $lookup: {
            from: 'owners',
            localField: 'owner',
            foreignField: '_id',
            as: 'ownerData'
          }
        },
        { $unwind: { path: '$ownerData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerData.user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
        ...(Object.keys(userMatchStage).length > 0 ? [{ $match: { 'userData': userMatchStage } }] : [])
      ] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ];

    const statusBreakdownResult = await Property.aggregate(statusBreakdownPipeline);
    const statusBreakdown = statusBreakdownResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {
      [PROPERTY_STATUS.PENDING]: 0,
      [PROPERTY_STATUS.APPROVED]: 0,
      [PROPERTY_STATUS.PUBLISHED]: 0,
      [PROPERTY_STATUS.REJECTED]: 0
    });

    // Format response data
    const formattedProperties = properties.map((property) => ({
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
      updatedAt: property.updatedAt,
      owner: property.owner && property.owner.user
        ? {
            id: property.owner.user._id,
            firstName: property.owner.user.firstName,
            lastName: property.owner.user.lastName,
            name: property.owner.user.name,
            email: property.owner.user.email,
            phone: property.owner.user.phone,
            verified: property.owner.user.verified,
            role: property.owner.user.role
          }
        : null
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      statusCode: 200,
      success: true,
      error: null,
      data: {
        message: 'Properties retrieved successfully',
        properties: formattedProperties,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProperties: totalCount,
          propertiesPerPage: limitNum,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          propertyId: propertyId || null,
          customerEmail: customerEmail || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          status: status || null,
          propertyType: propertyType || null,
          rentRange: { min: minRent || null, max: maxRent || null },
          bedrooms: bedrooms || null,
          bathrooms: bathrooms || null
        },
        sorting: {
          sortBy: sortField,
          sortOrder: sortOrder
        },
        statusBreakdown
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
  updatePropertyStatus,
  manageSiteVisit,
  getAllUsers,
  getAllPropertiesForAdmin,
  getAllBookings
};