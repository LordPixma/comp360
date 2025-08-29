export async function enqueueJob(queue, job, options = {}) {
    await queue.send(job, {
        contentType: 'json',
        delaySeconds: options.delay
    });
}
