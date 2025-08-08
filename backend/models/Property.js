const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const propertySchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'Owner', required: true },
  title: { type: String, required: true },
  description: { type: String },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  rent: { type: Number, required: true },
  deposit: { type: Number },
  propertyType: { type: String, enum: ['apartment', 'house', 'villa', 'condo'] },
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  area: { type: Number },
  amenities: [String],
  images: [String], // Array of image URLs
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'published'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('Property', propertySchema);