/**
 * Дымовая проверка матрицы прав (дублирует логику permissions.ts для CI без TS-сборки).
 * Запуск: node --test scripts/auth-matrix.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";

function hasOrgPermission(role, permission) {
  const MATRIX = {
    OWNER: { services: true, schedule: true, bookings: true, organization_settings: true },
    ADMIN: { services: true, schedule: true, bookings: true, organization_settings: true },
    STAFF: { services: false, schedule: true, bookings: true, organization_settings: false },
  };
  return MATRIX[role][permission] === true;
}

test("STAFF cannot manage services", () => {
  assert.equal(hasOrgPermission("STAFF", "services"), false);
});

test("STAFF can manage bookings", () => {
  assert.equal(hasOrgPermission("STAFF", "bookings"), true);
});

test("ADMIN can manage organization_settings", () => {
  assert.equal(hasOrgPermission("ADMIN", "organization_settings"), true);
});
