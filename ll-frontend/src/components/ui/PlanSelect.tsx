import { forwardRef, type SelectHTMLAttributes } from 'react';
import { PLAN_LABELS, PLAN_TIERS } from '@/constants/plans';
import { SelectField } from './Field';

const OPTIONS = PLAN_TIERS.map((p) => ({ value: p, label: PLAN_LABELS[p] }));

/** "Minimum plan" select (Free / Plus / Premium) for stories, rhymes, activities and products. */
export const PlanSelect = forwardRef<HTMLSelectElement, { label?: string; error?: string; full?: boolean } & SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label = 'Minimum plan', ...props }, ref) => <SelectField ref={ref} label={label} options={OPTIONS} {...props} />,
);
PlanSelect.displayName = 'PlanSelect';
