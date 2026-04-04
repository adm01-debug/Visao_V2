/**
 * VISÃO - Utils barrel export
 *
 * Collisions resolved by skipping redundant modules.
 */

export * from "./array";
export * from "./batch";
export * from "./circuit-breaker";
export * from "./color";
export * from "./compression";
export * from "./crypto";
export * from "./currency";
export * from "./date";
export * from "./deep";
export * from "./diff";
export * from "./dom";

// ./encryption: generateToken, generateUUID collide with ./crypto – skip
// export * from "./encryption";

export * from "./error";
export * from "./file";

// ./format: formatCurrency, formatNumber collide with ./currency – skip
// export * from "./format";

export * from "./hash";
export * from "./http";
export * from "./image";

// ./math: average, max, min, sum collide with ./array – skip
// export * from "./math";

export * from "./memoize";

// ./number: randomInt collides with ./crypto; formatCompact, formatNumber with ./currency
// Skip – canonical sources cover these
// export * from "./number";

export * from "./object";
export * from "./pool";
export * from "./promise";
export * from "./query";

// ./random: multiple collisions – skip
// export * from "./random";

export * from "./regex";

// ./retry: retry collides with ./promise – skip
// export * from "./retry";

export * from "./scheduler";
export * from "./scroll";
export * from "./security";

// ./string: escapeHtml collides with ./security – skip
// export * from "./string";

export * from "./throttle";
export * from "./tree";

// ./url: isUuid collides with ./regex – skip
// export * from "./url";

// ./uuid: isUuid collides with ./regex – skip
// export * from "./uuid";
// ./validation: isValidUrl collides with ./url (skipped) – safe to export now
export * from "./validation";
