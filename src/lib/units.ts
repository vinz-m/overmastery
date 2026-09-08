import type { Database } from "./supabase/database.types";

export type UnitSystem = Database["public"]["Enums"]["unit_system"];

const kilogramsPerPound = 0.45359237;

export function loadUnit(unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? "lb" : "kg";
}

export function toDisplayLoad(kilograms: number, unitSystem: UnitSystem) {
  return unitSystem === "imperial"
    ? roundLoad(kilograms / kilogramsPerPound)
    : roundLoad(kilograms);
}

export function toKilograms(value: number, unitSystem: UnitSystem) {
  return roundLoad(
    unitSystem === "imperial" ? value * kilogramsPerPound : value,
  );
}

export function formatDisplayLoad(
  kilograms: number | null,
  unitSystem: UnitSystem,
) {
  if (kilograms === null) return "—";
  const value = toDisplayLoad(kilograms, unitSystem);
  return Number.isInteger(value) ? String(value) : String(value);
}

export function formatDisplayDelta(
  kilograms: number,
  unitSystem: UnitSystem,
) {
  const value = toDisplayLoad(kilograms, unitSystem);
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function roundLoad(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}
