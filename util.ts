export async function scheduleChunk<T>(parallelism: number, chunkSize: number, input: T[], func: (chunk: T[]) => Promise<void>): Promise<void> {
    const tasks: Set<Promise<void>> = new Set();
    let idx = 0;
    while (idx < input.length) {
        if (tasks.size >= parallelism)
            await Promise.race(tasks);
        
        const slice = input.slice(idx, idx += chunkSize);
        const task = func(slice);
        tasks.add(task);

        task.finally(() => tasks.delete(task));
    }

    if (tasks.size !== 0) 
        await Promise.all(tasks);
}