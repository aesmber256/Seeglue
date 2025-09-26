export const enum LogLevel {
  Quiet = 0,
  Normal = 1,
  Verbose = 2,
};

export let level: LogLevel = LogLevel.Normal;
export const groupStack: LogLevel[] = [];

function group(logLevel: LogLevel, ...args: unknown[]) {
    groupStack.push(level);
    if (level >= logLevel)
        console.group(...args);
}

function groupCollapsed(logLevel: LogLevel, ...args: unknown[]) {
    groupStack.push(level);
    if (level >= logLevel)
        console.groupCollapsed(...args);
}

function log(logLevel: LogLevel, ...args: unknown[]) {
    if (level < logLevel) return;
    console.log(...args);
}

function error(logLevel: LogLevel, ...args: unknown[]) {
    if (level < logLevel) return;
    console.error(...args);
}

function _logGroup(logLevel: LogLevel) {
    if (logLevel <= LogLevel.Quiet)
        throw new RangeError("Can't have a log group that's quiet or less");

    return {
        group: group.bind(globalThis, logLevel),
        groupCollapsed: groupCollapsed.bind(globalThis, logLevel),
        groupEnd: groupEnd,
        log: log.bind(globalThis, logLevel),
        error: error.bind(globalThis, logLevel), 
    }
}

export function groupEnd() {
    if (groupStack.length === 0)
        throw new RangeError("Tried to pop a group while not inside group");
    level = groupStack.pop()!;
    console.groupEnd();
}

export const normal = _logGroup(LogLevel.Normal);
export const verbose = _logGroup(LogLevel.Verbose);