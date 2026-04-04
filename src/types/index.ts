/**
 * VISÃO - Types barrel export
 *
 * Collisions resolved: later modules that re-declare names from earlier ones
 * are imported selectively or skipped.
 */

export * from "./alert";
export * from "./analytics";
export * from "./api";
export * from "./auth";
export * from "./camera";
export * from "./clips";

// ./common: PaginatedResponse collides with ./api
// Skip entirely – ./api is canonical
// export * from "./common";

export * from "./continuousAnalysis";
export * from "./database";
export * from "./dto";

// ./enums: AlertSeverity, CameraStatus, UserRole collide with earlier modules
// Re-export only non-colliding members
export type { AlertStatus, Language, RecordingStatus, Theme, UserStatus } from "./enums";

export * from "./events";
export * from "./extended";
export * from "./faceRecognition";
export * from "./forms";
export * from "./guards";

// ./http: collides with ./api – skip
// export * from "./http";

export * from "./navigation";
export * from "./notification";

// ./notifications: collides with ./notification – skip
// export * from "./notifications";

export * from "./permissions";

// ./person: Person collides with ./faceRecognition
export type { Person as BasePerson, PersonType } from "./person";

// ./props: FormFieldProps collides with ./forms – skip
// export * from "./props";

export * from "./recording";
export * from "./responses";
export * from "./routes";
export * from "./rules";
export * from "./schemas";
export * from "./settings";
export * from "./socket";
export * from "./state";
export * from "./store";
export * from "./streaming";

// ./supabase: Tables collides with ./database – skip
// export * from "./supabase";

// ./surveillance: many collisions with ./alert, ./camera, ./rules – skip
// export * from "./surveillance";

export * from "./themes";

// ./user: User, UserRole collide with ./auth – skip
// export * from "./user";

export * from "./validation";
export * from "./vehicle";
export * from "./widgets";

// ./zones: ZoneEvent collides with ./events – skip
// export * from "./zones";
