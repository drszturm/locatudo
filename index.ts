
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();

// Interfaces
interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  phone?: string;
  verified: boolean;
}

interface IItem extends Document {
  name: string;
  description: string;
  category: string;
  pricePerHour: number;
  pricePerDay: number;
  owner: mongoose.Types.ObjectId;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  images: string[];
  available: boolean;
  condition: 'new' | 'excellent' | 'good' | 'fair';
}

interface IRental extends Document {
  item: mongoose.Types.ObjectId;
  renter: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  duration: {
    hours?: number;
    days?: number;
  };
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

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

// MongoDB connection (using in-memory for demo - you can connect to MongoDB Atlas)
const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-app';
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';

// User Schema
const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  location: {
    address: String,
    latitude: Number,
    longitude: Number
  },
  phone: String,
  verified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model<IUser>('User', userSchema);

// Item Schema
const itemSchema = new Schema<IItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  pricePerDay: { type: Number, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  images: [String],
  available: { type: Boolean, default: true },
  condition: { type: String, enum: ['new', 'excellent', 'good', 'fair'], default: 'good' }
}, { timestamps: true });

const Item = mongoose.model<IItem>('Item', itemSchema);

// Rental Schema
const rentalSchema = new Schema<IRental>({
  item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: {
    hours: Number,
    days: Number
  },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' }
}, { timestamps: true });

const Rental = mongoose.model<IRental>('Rental', rentalSchema);

// Auth middleware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

// Routes

// Register
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1 })
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, name, location, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      location,
      phone
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get items by location and category
app.get('/api/items/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, radius = 50, category, minPrice, maxPrice } = req.query;

    let query: any = { available: true };

    if (category) {
      query.category = new RegExp(category as string, 'i');
    }

    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = parseFloat(minPrice as string);
      if (maxPrice) query.pricePerDay.$lte = parseFloat(maxPrice as string);
    }

    let items = await Item.find(query).populate('owner', 'name email phone');

    // Filter by location if coordinates provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);

      items = items.filter(item => {
        const distance = calculateDistance(lat, lng, item.location.latitude, item.location.longitude);
        return distance <= radiusKm;
      });
    }

    res.json(items);
  } catch (error: any) {
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
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const item = new Item({
      ...req.body,
      owner: req.user?.userId
    });

    await item.save();
    await item.populate('owner', 'name email phone');

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create rental request
app.post('/api/rentals', authenticateToken, [
  body('itemId').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { itemId, startDate, endDate } = req.body;

    const item = await Item.findById(itemId);
    if (!item || !item.available) {
      res.status(400).json({ error: 'Item not available' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    const totalPrice = diffDays >= 1 ? 
      (diffDays * item.pricePerDay) : 
      (diffHours * item.pricePerHour);

    const rental = new Rental({
      item: itemId,
      renter: req.user?.userId,
      owner: item.owner,
      startDate: start,
      endDate: end,
      duration: {
        hours: diffHours,
        days: diffDays
      },
      totalPrice
    });

    await rental.save();
    await rental.populate(['item', 'renter', 'owner']);

    res.status(201).json(rental);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's rentals
app.get('/api/rentals/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rentals = await Rental.find({
      $or: [{ renter: req.user?.userId }, { owner: req.user?.userId }]
    }).populate(['item', 'renter', 'owner']);

    res.json(rentals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/rentals', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rentals = await Rental.find({}).populate(['item', 'renter', 'owner']);
    res.json(rentals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/items', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await Item.find({}).populate('owner', 'name email');
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('*', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
