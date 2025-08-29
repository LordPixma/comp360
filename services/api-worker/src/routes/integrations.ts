import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../index'
export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// GET /integrations - List integrations (stub)
integrationsRoutes.get('/', async (c) => {
  return c.json({ integrations: [] })
})


const app = new Hono()

// GET /api/v1/companies/{companyId}/integrations
app.get('/companies/:companyId/integrations', async (c) => {
    const { companyId } = c.req.param()
    // In a real app, you'd fetch this from the database for the specific company
    console.log(`Fetching integrations for company ${companyId}`)
    const integrations = [
        { id: 'int_1', type: 'aws', company_id: companyId },
        { id: 'int_2', type: 'github', company_id: companyId },
    ]
    return c.json(integrations)
})

// POST /api/v1/companies/{companyId}/integrations
app.post('/companies/:companyId/integrations', validator('json', (value, c) => {
    if (!value || !value.type || !value.config_json) {
        throw new HTTPException(400, { message: 'Request body must include type and config_json.' })
    }
    return value
}), async (c) => {
    const { companyId } = c.req.param()
    const body = c.req.valid('json')
    console.log(`Creating integration for company ${companyId}`, body)
    // In a real app, you'd insert this into the database
    const newIntegration = { id: `int_${Date.now()}`, company_id: companyId, ...body }
    return c.json(newIntegration, 201)
})

// DELETE /api/v1/integrations/{integrationId}
app.delete('/integrations/:integrationId', async (c) => {
    const { integrationId } = c.req.param()
    console.log(`Deleting integration ${integrationId}`)
    // In a real app, you'd find the integration by its ID and delete it from the database
    return c.json({ message: `Integration ${integrationId} deleted successfully.` })
})

export default app

