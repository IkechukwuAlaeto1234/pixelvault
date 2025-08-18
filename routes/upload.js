const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Category, Image } = require('../models');
const { requireAuth } = require('./auth');
const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'images');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `image-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  }
});

// Handle multiple image uploads
router.post('/images', upload.array('imageFiles', 10), async (req, res) => {
  try {
    const { category, tags, alt, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Verify category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const uploadedImages = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        const image = new Image({
          originalName: file.originalname,
          fileName: file.filename,
          filePath: `/uploads/images/${file.filename}`,
          mimeType: file.mimetype,
          size: file.size,
          category: category,
          tags: tagArray,
          alt: alt || '',
          description: description || '',
          userId: req.session.userId
        });

        await image.save();
        
        // Populate category for response
        await image.populate('category', 'name');
        
        uploadedImages.push(image);
      } catch (error) {
        console.error(`Error saving image ${file.originalname}:`, error);
        errors.push(`Failed to save ${file.originalname}: ${error.message}`);
        
        // Clean up file if database save failed
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ 
        error: 'No images were successfully uploaded',
        details: errors
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(async (file) => {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }

    res.status(500).json({ error: 'Upload failed due to server error' });
  }
});

// Delete image
router.delete('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findOne({ 
      _id: id, 
      userId: req.session.userId 
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', 'public', image.filePath);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await Image.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get image details
router.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findOne({ 
      _id: id, 
      userId: req.session.userId 
    }).populate('category', 'name');

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      image: image
    });

  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to get image details' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB per file.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files per upload.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name for file upload.' });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files are allowed (JPG, PNG, GIF, WebP, etc.)' });
  }

  res.status(500).json({ error: 'Upload failed due to server error' });
});

module.exports = router;