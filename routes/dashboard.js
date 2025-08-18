const express = require('express');
const { Category, Image } = require('../models');
const { requireAuth } = require('./auth');
const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(requireAuth);

// Dashboard home
router.get('/', async (req, res) => {
  try {
    // Get statistics
    const totalImages = await Image.countDocuments({ userId: req.session.userId });
    const totalCategories = await Category.countDocuments();
    
    // Get recent images (last 6)
    const recentImages = await Image.find({ userId: req.session.userId })
      .populate('category', 'name')
      .sort({ uploadDate: -1 })
      .limit(6);
    
    // Get categories (last 6)
    const categories = await Category.find({})
      .sort({ createdAt: -1 })
      .limit(6);

    const stats = {
      totalImages,
      totalCategories
    };

    res.render('dashboard/index', {
      title: 'Dashboard - PixelVault',
      stats,
      recentImages,
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Categories page
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });
    
    // Add image count for each category
    const categoriesWithCount = await Promise.all(categories.map(async (category) => {
      const imageCount = await Image.countDocuments({ category: category._id, userId: req.session.userId });
      return {
        ...category.toObject(),
        imageCount
      };
    }));

    res.render('dashboard/categories', {
      title: 'Categories - PixelVault',
      categories: categoriesWithCount,
      user: req.session.user
    });
  } catch (error) {
    console.error('Categories page error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = new Category({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    await category.save();

    res.json({
      success: true,
      message: 'Category created successfully',
      category: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: id }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description ? description.trim() : ''
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has images
    const imageCount = await Image.countDocuments({ category: id });
    if (imageCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category because it contains ${imageCount} image(s)` 
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Upload page
router.get('/upload', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });

    res.render('dashboard/upload', {
      title: 'Upload - PixelVault',
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Upload page error:', error);
    res.status(500).json({ error: 'Failed to load upload page' });
  }
});

// Gallery page
router.get('/gallery', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    // Filters
    const search = req.query.search || '';
    const categoryFilter = req.query.category || 'all';
    
    // Build query
    let query = { userId: req.session.userId };
    
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (categoryFilter !== 'all') {
      query.category = categoryFilter;
    }

    // Get images with pagination
    const images = await Image.find(query)
      .populate('category', 'name')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalImages = await Image.countDocuments(query);
    const totalPages = Math.ceil(totalImages / limit);

    // Get all categories for filter
    const categories = await Category.find({}).sort({ name: 1 });

    const pagination = {
      current: page,
      total: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      next: page + 1,
      prev: page - 1
    };

    const filters = {
      search,
      category: categoryFilter
    };

    res.render('dashboard/gallery', {
      title: 'Gallery - PixelVault',
      images,
      categories,
      pagination,
      filters,
      user: req.session.user
    });
  } catch (error) {
    console.error('Gallery page error:', error);
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

module.exports = router;