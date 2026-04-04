/**
 * VISÃO - Types barrel export
 *
 * Collisions resolved: later modules that re-declare names from earlier ones
 * are imported selectively (or skipped) to avoid TS2308.
 */

export * from "./alert";
export * from "./analytics";
export * from "./api";
export * from "./auth";
export * from "./camera";
export * from "./clips";
export * from "./common";
export * from "./continuousAnalysis";
export * from "./database";
export * from "./dto";

// ./enums: AlertSeverity, CameraStatus collide with ./alert, ./camera
// Re-export only non-colliding members
export {
  UserRole as EnumUserRole,
} from "./enums";

export * from "./events";
export * from "./extended";
export * from "./faceRecognition";
export * from "./forms";
export * from "./guards";

// ./http: ApiResponse, HttpMethod, PaginatedResponse collide with ./api
// Skip – ./api is the canonical source
// export * from "./http";

export * from "./navigation";
export * from "./notification";

// ./notifications: Notification, NotificationType collide with ./notification
// Skip – ./notification is the canonical source
// export * from "./notifications";

export * from "./permissions";

// ./person: Person collides with ./faceRecognition
// Skip – ./faceRecognition is the canonical source; ./person re-exported as alias
export { Person as BasePerson, PersonType } from "./person";

// ./props: FormFieldProps collides with ./forms
// Skip – ./forms is the canonical source
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

// ./supabase: Tables collides with ./database
// Skip – ./database is the canonical source
// export * from "./supabase";

// ./surveillance: Alert, AlertSeverity, AlertType, Camera, CameraStatus,
// Rule, RuleCondition, RuleConditionType collide with ./alert, ./camera, ./rules
// Skip – domain-specific files are canonical
// export * from "./surveillance";

export * from "./themes";

// ./user: User, UserRole collide with ./auth
// Skip – ./auth is the canonical source
// export * from "./user";

export * from "./validation";
export * from "./vehicle";
export * from "./widgets";

// ./zones: ZoneEvent collides with ./events
// Re-export only non-colliding members
export type { ZoneType as ZoneTypeAlias } from "./zones";
