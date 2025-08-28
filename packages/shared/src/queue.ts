export async function enqueueJob(
  queue: any,
  job: any,
  options: { delay?: number } = {}
): Promise<void> {
  await queue.send(job, {
    contentType: 'json',
    delaySeconds: options.delay
  })
}