import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import { requireRole } from '@c360/shared'
import { z } from 'zod'
import { CreateUserSchema } from '@c360/core'
import { generateId } from '@c360/shared'

const app = new Hono()

// Middleware to ensure user is a global admin
app.use('/*', async (c, next) => {
  // This is a placeholder. In a real app, you'd get the user from the session
  // and check if they are a global admin.
  const user = { role: 'global_admin' } // Mock user
  if (user.role !== 'global_admin') {
    throw new HTTPException(403, { message: 'Forbidden' })
  }
  await next()
})

// User Management
app.get('/users', (c) => {
  // In a real app, you'd fetch this from the database
  const users = [
    { id: 'clx2i0s0s0000s0m9c6p8a4b2', email: 'admin@comp360.com', name: 'Global Admin', is_global_admin: true },
    { id: 'user_2', email: 'test@test.com', name: 'Test User', is_global_admin: false },
  ]
  return c.json(users)
})

// POST /users - Create a new user
app.post('/users', 
  validator('json', (value, c) => {
    try {
      const parsed = CreateUserSchema.parse(value)
      return parsed
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, { 
          message: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        })
      }
      throw new HTTPException(400, { message: 'Invalid request data' })
    }
  }),
  async (c) => {
    const data = c.req.valid('json')
    
    try {
      // Check if user with this email already exists
      const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(data.email)
        .first()
      
      if (existingUser) {
        throw new HTTPException(409, { message: 'User with this email already exists' })
      }
      
      // Generate new user ID and create user
      const userId = await generateId()
      const createdAt = new Date().toISOString()
      
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, is_global_admin, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(userId, data.email, data.name, data.is_global_admin, createdAt).run()
      
      // Return the created user
      const newUser = {
        id: userId,
        email: data.email,
        name: data.name,
        is_global_admin: data.is_global_admin,
        created_at: createdAt
      }
      
      return c.json(newUser, 201)
    } catch (error) {
      // Re-throw HTTPExceptions
      if (error instanceof HTTPException) {
        throw error
      }
      
      // Handle database errors
      console.error('Database error creating user:', error)
      throw new HTTPException(500, { message: 'Failed to create user' })
    }
  }
)

// Company Management
app.get('/companies', (c) => {
    // In a real app, you'd fetch this from the database
    const companies = [
        {id: '1', name: 'Test Company', region: 'EU'}
    ]
    return c.json(companies)
})

export default app
