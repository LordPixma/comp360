import { Hono } from 'hono'
import { z } from 'zod'
import { UserSchema } from '@core/schemas'
import type { Env } from '../index'

export const usersRoutes = new Hono<{ Bindings: Env }>()

// Schema for updating user profile
const UpdateUserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional()
})

// Type for API response
type UserProfile = z.infer<typeof UserSchema>

// GET /users/me - Retrieve the profile of the currently authenticated user
usersRoutes.get('/me', async (c) => {
  const userPayload = c.get('user')
  
  if (!userPayload || !userPayload.sub) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }, 401)
  }

  try {
    // Query the database for the user's profile
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, created_at, is_global_admin FROM users WHERE id = ?'
    ).bind(userPayload.sub).first()

    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      is_global_admin: Boolean(user.is_global_admin)
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' } }, 500)
  }
})

// PUT /users/me - Update the profile of the currently authenticated user
usersRoutes.put('/me', async (c) => {
  const userPayload = c.get('user')
  
  if (!userPayload || !userPayload.sub) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }, 401)
  }

  try {
    const body = await c.req.json()
    const data = UpdateUserProfileSchema.parse(body)

    // If no fields to update, return current profile
    if (!data.name) {
      const user = await c.env.DB.prepare(
        'SELECT id, email, name, created_at, is_global_admin FROM users WHERE id = ?'
      ).bind(userPayload.sub).first()
      
      if (!user) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
      }

      return c.json({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        is_global_admin: Boolean(user.is_global_admin)
      })
    }

    // Update the user's profile
    await c.env.DB.prepare(
      'UPDATE users SET name = ? WHERE id = ?'
    ).bind(data.name, userPayload.sub).run()

    // Return updated profile
    const updatedUser = await c.env.DB.prepare(
      'SELECT id, email, name, created_at, is_global_admin FROM users WHERE id = ?'
    ).bind(userPayload.sub).first()

    if (!updatedUser) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found after update' } }, 404)
    }

    return c.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      created_at: updatedUser.created_at,
      is_global_admin: Boolean(updatedUser.is_global_admin)
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request data',
          details: error.errors
        } 
      }, 400)
    }
    
    console.error('Error updating user profile:', error)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile' } }, 500)
  }
})