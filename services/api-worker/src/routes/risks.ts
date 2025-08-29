import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

// GET /api/v1/companies/{companyId}/risks
app.get('/companies/:companyId/risks', async (c) => {
    const { companyId } = c.req.param()
    // In a real app, you'd fetch this from the database for the specific company
    console.log(`Fetching risks for company ${companyId}`)
    const risks = [
        { id: 'risk_1', title: 'Data breach due to weak passwords', impact: 4, likelihood: 3, company_id: companyId },
        { id: 'risk_2', title: 'Unauthorized physical access to servers', impact: 5, likelihood: 2, company_id: companyId },
    ]
    return c.json(risks)
})

// POST /api/v1/companies/{companyId}/risks
app.post('/companies/:companyId/risks', validator('json', (value, c) => {
    if (!value || !value.title || !value.impact || !value.likelihood) {
        throw new HTTPException(400, { message: 'Request body must include title, impact, and likelihood.' })
    }
    return value
}), async (c) => {
    const { companyId } = c.req.param()
    const body = c.req.valid('json')
    console.log(`Creating risk for company ${companyId}`, body)
    // In a real app, you'd insert this into the database
    const newRisk = { id: `risk_${Date.now()}`, company_id: companyId, ...body }
    return c.json(newRisk, 201)
})

// PUT /api/v1/risks/{riskId}
app.put('/risks/:riskId', validator('json', (value, c) => {
    if (!value || Object.keys(value).length === 0) {
        throw new HTTPException(400, { message: 'Request body cannot be empty.' })
    }
    return value
}), async (c) => {
    const { riskId } = c.req.param()
    const body = c.req.valid('json')
    console.log(`Updating risk ${riskId}`, body)
    // In a real app, you'd find the risk by its ID and update it in the database
    const updatedRisk = { id: riskId, ...body }
    return c.json(updatedRisk)
})

export default app
