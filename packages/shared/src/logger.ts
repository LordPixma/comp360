export interface LogEntry {
  ts: string
  tenant?: string
  level: 'debug' | 'info' | 'warn' | 'error'
  evt: string
  fields?: Record<string, any>
  cid?: string // correlation ID
}

export class Logger {
  constructor(
    private tenant?: string,
    private correlationId?: string
  ) {}

  private log(level: LogEntry['level'], evt: string, fields?: Record<string, any>) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      tenant: this.tenant,
      level,
      evt,
      fields,
      cid: this.correlationId
    }
    
    // In production, send to Analytics Engine
    // For now, console log (will be captured by Cloudflare)
    console.log(JSON.stringify(entry))
  }

  debug(evt: string, fields?: Record<string, any>) {
    this.log('debug', evt, fields)
  }

  info(evt: string, fields?: Record<string, any>) {
    this.log('info', evt, fields)
  }

  warn(evt: string, fields?: Record<string, any>) {
    this.log('warn', evt, fields)
  }

  error(evt: string, fields?: Record<string, any>) {
    this.log('error', evt, fields)
  }
}