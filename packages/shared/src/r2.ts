export async function generatePresignedUrl(
  bucket: any,
  key: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  // This would use AWS SigV4 algorithm
  // For MVP, we'll use Cloudflare's built-in signed URLs
  const url = new URL(`https://r2.example.com/${key}`)
  const expires = Math.floor(Date.now() / 1000) + expiresIn
  
  // Add signature (simplified for example)
  url.searchParams.set('X-Amz-Expires', expiresIn.toString())
  url.searchParams.set('X-Amz-Date', new Date().toISOString())
  
  return url.toString()
}