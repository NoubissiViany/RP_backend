const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// GET /users (Super Admin only)
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires Super Admin role)
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware.authenticateToken, authMiddleware.authorizeRole('Super Admin'), async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users' });
  }
});

// POST /users (Create a new user)
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/User'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request (missing or invalid input)
 *       500:
 *         description: Internal server error
 */
router.post('/', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { username, email, password, role, company, team, permissions } = req.body;

    // Input validation (add your validation logic here)
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Username, email, password, and role are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      company,
      team,
      permissions,
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

// GET /users/:id (Retrieve a specific user)
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user' });
  }
});

// PUT /users/:id (Update a user)
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/User'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { username, email, password, role, company, team, permissions } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, company, team, permissions },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash password if provided
    if (password) {
      const hashedPassword = await bcryptjs.hash(password, 10);
      updatedUser.password = hashedPassword;
      await updatedUser.save();
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

// DELETE /users/:id (Delete a user)
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden (requires Super Admin role)
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.authorizeRole('Super Admin'), async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// GET /users/me (Get current user's profile)
/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user' });
  }
});

module.exports = router;