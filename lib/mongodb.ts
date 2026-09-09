import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = globalThis.mongooseCache || { conn: null, promise: null };

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

/**
 * Seeds default Admin and Telecaller accounts if User collection is empty or updates root admin
 */
async function seedDefaultUsers() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[MONGODB] Initializing root Admin account...');
      await User.create([
        {
          employeeId: 'EMP-1001',
          name: 'Avinash Jha',
          email: 'avinashjhacode@gmail.com',
          passwordHash: bcrypt.hashSync('Admin@111', 10),
          role: 'ADMIN',
          phone: '+91 98000 10001',
          active: true,
        },
      ]);
      console.log('[MONGODB] ✓ Root Admin seeded successfully.');
    }
  } catch (err) {
    console.error('[MONGODB SEED ERROR]', err);
  }
}

/**
 * Connects to MongoDB with caching for serverless & Next.js hot-reloading
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/vyapar_wallah';

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then(async (m) => {
        console.log('[MONGODB] ✓ Successfully connected to MongoDB database.');
        await seedDefaultUsers();
        return m;
      })
      .catch((err) => {
        console.warn('[MONGODB CONNECTION WARN]', err?.message || err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
