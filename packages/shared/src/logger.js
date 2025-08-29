export class Logger {
    tenant;
    correlationId;
    constructor(tenant, correlationId) {
        this.tenant = tenant;
        this.correlationId = correlationId;
    }
    log(level, evt, fields) {
        const entry = {
            ts: new Date().toISOString(),
            tenant: this.tenant,
            level,
            evt,
            fields,
            cid: this.correlationId
        };
        // In production, send to Analytics Engine
        // For now, console log (will be captured by Cloudflare)
        console.log(JSON.stringify(entry));
    }
    debug(evt, fields) {
        this.log('debug', evt, fields);
    }
    info(evt, fields) {
        this.log('info', evt, fields);
    }
    warn(evt, fields) {
        this.log('warn', evt, fields);
    }
    error(evt, fields) {
        this.log('error', evt, fields);
    }
}
