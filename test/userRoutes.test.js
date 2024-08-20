const request = require('supertest');
const app = require('../app'); 
const User = require('../models/User'); 
const bcryptjs = require('bcryptjs'); 
const authMiddleware = require('../middleware/authMiddleware');

// Mock data for testing
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpassword',
  role: 'Admin',
  company: 'Test Company',
  team: 'Test Team',
  permissions: ['read', 'write'],
};

// Mock authentication middleware
jest.mock('../middleware/authMiddleware');
authMiddleware.authenticateToken = jest.fn((req, res, next) => next());
authMiddleware.authorizeRole = jest.fn((role) => (req, res, next) => {
  req.user = { role: role };
  next();
});

describe('User Routes', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await User.deleteMany();
  });

  describe('GET /users', () => {
    it('should return a list of users (Super Admin only)', async () => {
      // Create some test users
      await User.create(testUser);
      await User.create({ ...testUser, username: 'testuser2' });

      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer testToken'); // Mock authorization

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].username).toBe('testuser');
      expect(response.body[1].username).toBe('testuser2');
    });

    it('should return 403 Forbidden if not Super Admin', async () => {
      authMiddleware.authorizeRole.mockReturnValueOnce((req, res, next) => {
        req.user = { role: 'Admin' };
        next();
      });

      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer testToken')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created successfully');

      const createdUser = await User.findOne({ username: testUser.username });
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(testUser.email);
      // Password should be hashed
      expect(await bcryptjs.compare(testUser.password, createdUser.password)).toBe(true);
    });

    it('should return 400 Bad Request if missing required fields', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer testToken')
        .send({ email: testUser.email }); // Missing username, password, role

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Username, email, password, and role are required');
    });

    it('should return 400 Bad Request if username or email already exists', async () => {
      await User.create(testUser);

      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer testToken')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Username or email already exists');
    });
  });

  describe('GET /users/:id', () => {
    it('should retrieve a specific user', async () => {
      const createdUser = await User.create(testUser);

      const response = await request(app)
        .get(`/users/${createdUser._id}`)
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.email).toBe(testUser.email);
    });

    it('should return 404 Not Found if user not found', async () => {
      const response = await request(app)
        .get('/users/1234567890')
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', async () => {
      const createdUser = await User.create(testUser);

      const updatedUsername = 'updatedtestuser';
      const response = await request(app)
        .put(`/users/${createdUser._id}`)
        .set('Authorization', 'Bearer testToken')
        .send({ username: updatedUsername });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.username).toBe(updatedUsername);

      const updatedUser = await User.findById(createdUser._id);
      expect(updatedUser.username).toBe(updatedUsername);
    });

    it('should return 404 Not Found if user not found', async () => {
      const response = await request(app)
        .put('/users/1234567890')
        .set('Authorization', 'Bearer testToken')
        .send({ username: 'updatedtestuser' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should hash the password if provided', async () => {
      const createdUser = await User.create(testUser);

      const newPassword = 'newpassword';
      const response = await request(app)
        .put(`/users/${createdUser._id}`)
        .set('Authorization', 'Bearer testToken')
        .send({ password: newPassword });

      expect(response.status).toBe(200);

      const updatedUser = await User.findById(createdUser._id);
      expect(await bcryptjs.compare(newPassword, updatedUser.password)).toBe(true);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user (Super Admin only)', async () => {
      const createdUser = await User.create(testUser);

      const response = await request(app)
        .delete(`/users/${createdUser._id}`)
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');

      const deletedUser = await User.findById(createdUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 Not Found if user not found', async () => {
      const response = await request(app)
        .delete('/users/1234567890')
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 403 Forbidden if not Super Admin', async () => {
      authMiddleware.authorizeRole.mockReturnValueOnce((req, res, next) => {
        req.user = { role: 'Admin' };
        next();
      });

      const createdUser = await User.create(testUser);

      const response = await request(app)
        .delete(`/users/${createdUser._id}`)
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /users/me', () => {
    it('should retrieve the current user\'s profile', async () => {
      authMiddleware.authenticateToken.mockReturnValueOnce((req, res, next) => {
        req.user = { id: testUser._id };
        next();
      });

      const createdUser = await User.create(testUser);

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.email).toBe(testUser.email);
    });

    it('should return 404 Not Found if user not found', async () => {
      authMiddleware.authenticateToken.mockReturnValueOnce((req, res, next) => {
        req.user = { id: '1234567890' };
        next();
      });

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer testToken');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});