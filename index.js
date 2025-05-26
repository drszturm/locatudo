
const express = require('express');
const { DataSource } = require('typeorm');
const { EntitySchema } = require('typeorm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('reflect-metadata');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/rental_app';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Entity Schemas
const UserEntity = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    email: {
      type: 'varchar',
      unique: true,
      nullable: false
    },
    password: {
      type: 'varchar',
      nullable: false
    },
    name: {
      type: 'varchar',
      nullable: false
    },
    role: {
      type: 'enum',
      enum: ['user', 'admin'],
      default: 'user'
    },
    locationAddress: {
      type: 'varchar',
      nullable: true
    },
    locationLatitude: {
      type: 'decimal',
      precision: 10,
      scale: 8,
      nullable: true
    },
    locationLongitude: {
      type: 'decimal',
      precision: 11,
      scale: 8,
      nullable: true
    },
    phone: {
      type: 'varchar',
      nullable: true
    },
    verified: {
      type: 'boolean',
      default: false
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true
    }
  }
});

const ItemEntity = new EntitySchema({
  name: 'Item',
  tableName: 'items',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    name: {
      type: 'varchar',
      nullable: false
    },
    description: {
      type: 'text',
      nullable: false
    },
    category: {
      type: 'varchar',
      nullable: false
    },
    pricePerHour: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false
    },
    pricePerDay: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false
    },
    ownerId: {
      type: 'int',
      nullable: false
    },
    locationAddress: {
      type: 'varchar',
      nullable: false
    },
    locationLatitude: {
      type: 'decimal',
      precision: 10,
      scale: 8,
      nullable: false
    },
    locationLongitude: {
      type: 'decimal',
      precision: 11,
      scale: 8,
      nullable: false
    },
    images: {
      type: 'text',
      array: true,
      nullable: true
    },
    available: {
      type: 'boolean',
      default: true
    },
    condition: {
      type: 'enum',
      enum: ['new', 'excellent', 'good', 'fair'],
      default: 'good'
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true
    }
  },
  relations: {
    owner: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'ownerId' }
    }
  }
});

const RentalEntity = new EntitySchema({
  name: 'Rental',
  tableName: 'rentals',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    itemId: {
      type: 'int',
      nullable: false
    },
    renterId: {
      type: 'int',
      nullable: false
    },
    ownerId: {
      type: 'int',
      nullable: false
    },
    startDate: {
      type: 'timestamp',
      nullable: false
    },
    endDate: {
      type: 'timestamp',
      nullable: false
    },
    durationHours: {
      type: 'int',
      nullable: true
    },
    durationDays: {
      type: 'int',
      nullable: true
    },
    totalPrice: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: false
    },
    status: {
      type: 'enum',
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending'
    },
    paymentStatus: {
      type: 'enum',
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true
    }
  },
  relations: {
    item: {
      type: 'many-to-one',
      target: 'Item',
      joinColumn: { name: 'itemId' }
    },
    renter: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'renterId' }
    },
    owner: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'ownerId' }
    }
  }
});

// Database connection
const AppDataSource = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  entities: [UserEntity, ItemEntity, RentalEntity],
  synchronize: true, // Set to false in production
  logging: false
});

// Repository references
let userRepository, itemRepository, rentalRepository;

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Register
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, location, phone } = req.body;

    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = userRepository.create({
      email,
      password: hashedPassword,
      name,
      locationAddress: location?.address,
      locationLatitude: location?.latitude,
      locationLongitude: location?.longitude,
      phone
    });

    await userRepository.save(user);

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get items by location and category
app.get('/api/items/search', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, category, minPrice, maxPrice } = req.query;

    let queryBuilder = itemRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.owner', 'owner')
      .where('item.available = :available', { available: true });

    if (category) {
      queryBuilder.andWhere('LOWER(item.category) LIKE LOWER(:category)', { category: `%${category}%` });
    }

    if (minPrice) {
      queryBuilder.andWhere('item.pricePerDay >= :minPrice', { minPrice: parseFloat(minPrice) });
    }

    if (maxPrice) {
      queryBuilder.andWhere('item.pricePerDay <= :maxPrice', { maxPrice: parseFloat(maxPrice) });
    }

    let items = await queryBuilder.getMany();

    // Filter by location if coordinates provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      items = items.filter(item => {
        const distance = calculateDistance(lat, lng, parseFloat(item.locationLatitude), parseFloat(item.locationLongitude));
        return distance <= radiusKm;
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new item
app.post('/api/items', authenticateToken, [
  body('name').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('category').trim().isLength({ min: 1 }),
  body('pricePerHour').isNumeric(),
  body('pricePerDay').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, pricePerHour, pricePerDay, location, images, condition } = req.body;

    const item = itemRepository.create({
      name,
      description,
      category,
      pricePerHour,
      pricePerDay,
      ownerId: req.user.userId,
      locationAddress: location.address,
      locationLatitude: location.latitude,
      locationLongitude: location.longitude,
      images,
      condition
    });

    await itemRepository.save(item);
    
    const savedItem = await itemRepository.findOne({
      where: { id: item.id },
      relations: ['owner']
    });

    res.status(201).json(savedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create rental request
app.post('/api/rentals', authenticateToken, [
  body('itemId').isNumeric(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, startDate, endDate } = req.body;

    const item = await itemRepository.findOne({ where: { id: itemId } });
    if (!item || !item.available) {
      return res.status(400).json({ error: 'Item not available' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    const totalPrice = diffDays >= 1 ? 
      (diffDays * parseFloat(item.pricePerDay)) : 
      (diffHours * parseFloat(item.pricePerHour));

    const rental = rentalRepository.create({
      itemId: parseInt(itemId),
      renterId: req.user.userId,
      ownerId: item.ownerId,
      startDate: start,
      endDate: end,
      durationHours: diffHours,
      durationDays: diffDays,
      totalPrice
    });

    await rentalRepository.save(rental);
    
    const savedRental = await rentalRepository.findOne({
      where: { id: rental.id },
      relations: ['item', 'renter', 'owner']
    });

    res.status(201).json(savedRental);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's rentals
app.get('/api/rentals/my', authenticateToken, async (req, res) => {
  try {
    const rentals = await rentalRepository.find({
      where: [
        { renterId: req.user.userId },
        { ownerId: req.user.userId }
      ],
      relations: ['item', 'renter', 'owner']
    });

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await userRepository.find({
      select: ['id', 'email', 'name', 'role', 'locationAddress', 'phone', 'verified', 'createdAt', 'updatedAt']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/rentals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rentals = await rentalRepository.find({
      relations: ['item', 'renter', 'owner']
    });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/items', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = await itemRepository.find({
      relations: ['owner']
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend for non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route for frontend (excluding API routes)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Connect to PostgreSQL and start server
AppDataSource.initialize()
  .then(() => {
    console.log('Connected to PostgreSQL');
    
    // Initialize repositories
    userRepository = AppDataSource.getRepository('User');
    itemRepository = AppDataSource.getRepository('Item');
    rentalRepository = AppDataSource.getRepository('Rental');
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
  });
