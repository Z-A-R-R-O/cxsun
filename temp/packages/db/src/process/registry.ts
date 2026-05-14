import { databaseMigrations } from "../migrations";
import { databaseSeeders } from "../seeders";
import { defineAppDatabaseModule, type AppDatabaseModule } from "./types";

export const organisationDatabaseModule = defineAppDatabaseModule({
  appId: "organisation",
  label: "Organisation",
  order: 10,
  migrations: databaseMigrations,
  seeders: databaseSeeders,
});

export const registeredDatabaseModules: readonly AppDatabaseModule[] = [
  organisationDatabaseModule,
].sort((left, right) => left.order - right.order || left.appId.localeCompare(right.appId));

export function listRegisteredDatabaseMigrations() {
  return registeredDatabaseModules.flatMap((module) =>
    [...module.migrations].sort(
      (left, right) => left.order - right.order || left.id.localeCompare(right.id),
    ),
  );
}

export function listRegisteredDatabaseSeeders() {
  return registeredDatabaseModules.flatMap((module) =>
    [...module.seeders].sort(
      (left, right) => left.order - right.order || left.id.localeCompare(right.id),
    ),
  );
}
