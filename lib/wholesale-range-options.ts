import { generatePowerOptions } from '@/lib/prescription-range';

/** SPH bounds for wholesale range pickers (-6.00 to +2.00). */
export const WHOLESALE_SPH_BOUND_OPTIONS = generatePowerOptions(-6, 2);

/** CYL bounds for wholesale range pickers. */
export const WHOLESALE_CYL_BOUND_OPTIONS = generatePowerOptions(-2, 4);

/** ADD bounds for Kryptok / Progressive wholesale (+1.00 to +3.00). */
export const WHOLESALE_ADD_BOUND_OPTIONS = generatePowerOptions(1, 3);

/** Step size options for wholesale grid generation. */
export const WHOLESALE_STEP_OPTIONS = [0.25, 0.5, 0.75, 1] as const;
