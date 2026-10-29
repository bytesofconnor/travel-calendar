/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as access from "../access.js";
import type * as agentKeys from "../agentKeys.js";
import type * as agentReads from "../agentReads.js";
import type * as auth from "../auth.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as lib_apiKeys from "../lib/apiKeys.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as lib_stripeWebhook from "../lib/stripeWebhook.js";
import type * as lib_themePack from "../lib/themePack.js";
import type * as lib_tripData from "../lib/tripData.js";
import type * as notes from "../notes.js";
import type * as packing from "../packing.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  access: typeof access;
  agentKeys: typeof agentKeys;
  agentReads: typeof agentReads;
  auth: typeof auth;
  health: typeof health;
  http: typeof http;
  items: typeof items;
  "lib/apiKeys": typeof lib_apiKeys;
  "lib/auth": typeof lib_auth;
  "lib/customFunctions": typeof lib_customFunctions;
  "lib/stripeWebhook": typeof lib_stripeWebhook;
  "lib/themePack": typeof lib_themePack;
  "lib/tripData": typeof lib_tripData;
  notes: typeof notes;
  packing: typeof packing;
  trips: typeof trips;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
