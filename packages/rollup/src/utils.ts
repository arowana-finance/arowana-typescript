export type DecapitalizeOpts = [string, ...string[]];

export const decapitalize = ([first, ...rest]: DecapitalizeOpts, upperRest = false): string =>
    first.toLowerCase() + (upperRest ? rest.join('').toUpperCase() : rest.join(''));
