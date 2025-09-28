export async function shell(exec: string, args?: string[]): Promise<Seeglue.ShellResult> {
    const result = await new Deno.Command(exec, {
        args: args
    }).output();
    
    return {
        signal: result.signal,
        exitCode: result.code,
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr
    }
}