/**
 * Measurement value validation utilities.
 * Range checks follow WHO/Indonesian clinical standards.
 */

/**
 * Validate weight in kilograms.
 * Plausible range: 0.5 – 30 kg (newborn to 5-year balita).
 */
export function validateWeight(kg: number): boolean {
  return kg >= 0.5 && kg <= 30
}

/**
 * Validate height/length in centimeters.
 * Plausible range: 30 – 130 cm.
 */
export function validateHeight(cm: number): boolean {
  return cm >= 30 && cm <= 130
}

/**
 * Validate head circumference in centimeters.
 * Plausible range: 20 – 60 cm.
 */
export function validateHeadCirc(cm: number): boolean {
  return cm >= 20 && cm <= 60
}

/**
 * Validate mid-upper arm circumference (LILA) in centimeters.
 * Plausible range: 5 – 30 cm.
 */
export function validateArmCirc(cm: number): boolean {
  return cm >= 5 && cm <= 30
}

/**
 * Validate age in days.
 * Valid range: 0 – 1856 days (0–60 months / 5 years).
 */
export function validateAge(ageDays: number): boolean {
  return ageDays >= 0 && ageDays <= 1856
}
