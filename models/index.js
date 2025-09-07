const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  storageUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  maxStorage: {
    type: Number,
    default: 10 * 1024 * 1024 * 1024, // 10GB default storage
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    },
    defaultCompression: {
      type: String,
      default: 'none',
      enum: ['none', 'low', 'medium', 'high']
    }
  }
}, {
  timestamps: true
});

// Virtual for checking storage availability
userSchema.virtual('storageAvailable').get(function() {
  return this.maxStorage - this.storageUsed;
});

userSchema.virtual('storageUsedPercentage').get(function() {
  return ((this.storageUsed / this.maxStorage) * 100).toFixed(2);
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
    match: [/^[a-zA-Z0-9\s\-_]+$/, 'Category name can only contain letters, numbers, spaces, hyphens, and underscores']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  coverImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  imageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Image Schema (Optimized for large files)
const imageSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
    maxlength: 255
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0,
    max: 100 * 1024 * 1024 // 100MB max per image
  },
  dimensions: {
    width: {
      type: Number,
      min: 1
    },
    height: {
      type: Number,
      min: 1
    }
  },
  compression: {
    type: String,
    enum: ['none', 'low', 'medium', 'high'],
    default: 'none'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  alt: {
    type: String,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  metadata: {
    camera: String,
    lens: String,
    exposure: String,
    iso: Number,
    focalLength: Number,
    gps: {
      latitude: Number,
      longitude: Number
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  downloads: {
    type: Number,
    default: 0,
    min: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  uploadStatus: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'queued'],
    default: 'processing'
  },
  processingError: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
imageSchema.index({ userId: 1, uploadDate: -1 });
imageSchema.index({ tags: 1 });
imageSchema.index({ category: 1, isPublic: 1 });
imageSchema.index({ size: -1 });
imageSchema.index({ 'metadata.gps': '2dsphere' });

// Virtual for file extension
imageSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Virtual for human-readable file size
imageSchema.virtual('sizeFormatted').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Byte';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Middleware to update user storage and category count
imageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Update user storage
      await mongoose.model('User').findByIdAndUpdate(
        this.userId,
        { $inc: { storageUsed: this.size } }
      );
      
      // Update category image count
      await mongoose.model('Category').findByIdAndUpdate(
        this.category,
        { $inc: { imageCount: 1 } }
      );
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Middleware to cleanup storage and counts on deletion
imageSchema.pre('remove', async function(next) {
  try {
    // Decrement user storage
    await mongoose.model('User').findByIdAndUpdate(
      this.userId,
      { $inc: { storageUsed: -this.size } }
    );
    
    // Decrement category image count
    await mongoose.model('Category').findByIdAndUpdate(
      this.category,
      { $inc: { imageCount: -1 } }
    );
  } catch (error) {
    return next(error);
  }
  next();
});

// Static method to get storage usage by user
imageSchema.statics.getStorageUsage = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$userId',
        totalStorage: { $sum: '$size' },
        totalImages: { $sum: 1 },
        avgSize: { $avg: '$size' }
      }
    }
  ]);
};

// Create models
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Image = mongoose.model('Image', imageSchema);

module.exports = {
  User,
  Category,
  Image
};
