import { pgRole } from "drizzle-orm/pg-core";

// Created by the first migration; `.existing()` keeps drizzle-kit from managing them.
export const framedAuthRole = pgRole("framed_auth").existing();
export const framedAppRole = pgRole("framed_app").existing();
