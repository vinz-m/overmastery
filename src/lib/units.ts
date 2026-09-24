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

// Kilograms keep three decimals (the column's precision) so a pound value
// survives the round trip: 2.5 lb -> 1.134 kg -> 2.5 lb.
export function toKilograms(value: number, unitSystem: UnitSystem) {
  const kilograms =
    unitSystem === "imperial" ? value * kilogramsPerPound : value;
  return Math.round(kilograms * 1000) / 1000;
}

/** Converts a typed load to another unit, snapped to that unit's input step. */
export function convertLoadInput(
  value: number,
  from: UnitSystem,
  to: UnitSystem,
) {
  const converted = toDisplayLoad(toKilograms(value, from), to);
  const step = loadStep(to);
  return Math.round(converted / step) * step;
}

export function loadStep(unitSystem: UnitSystem) {
  return unitSystem === "imperial" ? 0.5 : 0.25;
}

export function formatDisplayLoad(
  kilograms: number | null,
  unitSystem: UnitSystem,
) {
  if (kilograms === null) return "—";
  const value = toDisplayLoad(kilograms, unitSystem);
  return Number.isInteger(value) ? String(value) : String(value);
}

export function formatDisplayDelta(kilograms: number, unitSystem: UnitSystem) {
  const value = toDisplayLoad(kilograms, unitSystem);
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function roundLoad(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "");
}
