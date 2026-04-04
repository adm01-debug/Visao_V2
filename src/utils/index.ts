/**
 * VISÃO - Utils barrel export
 *
 * Collisions resolved by skipping redundant modules or using aliases.
 */

export * from "./array";
export * from "./batch";
export * from "./circuit-breaker";
// ./cn does not exist – removed
export * from "./color";
export * from "./compression";
export * from "./crypto";
export * from "./currency";
export * from "./date";
export * from "./deep";
export * from "./diff";
export * from "./dom";

// ./encryption: generateToken, generateUUID collide with ./crypto
// Skip – ./crypto is the canonical source
// export * from "./encryption";

export * from "./error";
export * from "./file";

// ./format: formatCurrency, formatNumber collide with ./currency
// Skip – ./currency is the canonical source
// export * from "./format";

export * from "./hash";
export * from "./http";
export * from "./image";

// ./math: average, max, min, sum collide with ./array
// Skip – ./array is the canonical source
// export * from "./math";

export * from "./memoize";
export * from "./number";
export * from "./object";
export * from "./pool";
export * from "./promise";
export * from "./query";

// ./random: randomInt collides with ./crypto, randomFloat with ./number,
// shuffle with ./array, randomColor with ./color
// Skip – canonical sources cover these
// export * from "./random";

export * from "./regex";
export * from "./retry";
export * from "./scheduler";
export * from "./scroll";
export * from "./security";
export * from "./string";
export * from "./throttle";
export * from "./tree";
export * from "./url";
export * from "./uuid";

// ./validation: isValidUrl collides with ./url
// Re-export only non-colliding members or skip
// export * from "./validation";
