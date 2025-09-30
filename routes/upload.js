const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Image, Category, User } = require('../models');
const { requireAuth } = require('./auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: fileFilter
});

// Get upload page
router.get('/upload', requireAuth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.session.userId });
    const user = await User.findById(req.session.userId);
    
    // Calculate storage usage
    const userImages = await Image.find({ userId: req.session.userId });
    const totalSize = userImages.reduce((sum, img) => sum + img.fileSize, 0);
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB
    const storageUsed = totalSize;
    const storagePercentage = ((storageUsed / storageLimit) * 100).toFixed(1);

    res.render('upload', {
      title: 'Upload Images - PixelVault',
      categories,
      storageUsed,
      storageLimit,
      storagePercentage,
      user,
      error: null,
      message: req.query.message || null
    });
  } catch (error) {
    console.error('Upload page error:', error);
    res.redirect('/dashboard?error=Failed to load upload page');
  }
});

// Handle file upload
router.post('/upload', requireAuth, upload.array('imageFiles', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.redirect('/dashboard/upload?error=No files selected');
    }

    const { category, tags, alt, description } = req.body;
    
    if (!category) {
      // Clean up uploaded files
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.redirect('/dashboard/upload?error=Category is required');
    }

    // Check if category belongs to user
    const userCategory = await Category.findOne({ 
      _id: category, 
      userId: req.session.userId 
    });
    
    if (!userCategory) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.redirect('/dashboard/upload?error=Invalid category');
    }

    // Calculate total size of new files
    const totalNewSize = req.files.reduce((sum, file) => sum + file.size, 0);
    
    // Check storage limit (10GB)
    const userImages = await Image.find({ userId: req.session.userId });
    const currentUsage = userImages.reduce((sum, img) => sum + img.fileSize, 0);
    const storageLimit = 10 * 1024 * 1024 * 1024;
    
    if (currentUsage + totalNewSize > storageLimit) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.redirect('/dashboard/upload?error=Insufficient storage space');
    }

    // Process each file
    const uploadPromises = req.files.map(async (file) => {
      const image = new Image({
        userId: req.session.userId,
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        categoryId: category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        altText: alt || '',
        description: description || ''
      });
      
      await image.save();
      return image;
    });

    await Promise.all(uploadPromises);

    res.redirect('/dashboard/upload?message=Files uploaded successfully');
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.redirect('/dashboard/upload?error=Upload failed');
  }
});

// Get upload progress (for future real-time progress implementation)
router.get('/upload/progress', requireAuth, (req, res) => {
  // This would integrate with a progress tracking system
  res.json({ progress: 0 });
});

module.exports = router;
