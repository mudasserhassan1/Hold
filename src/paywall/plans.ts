export type PlanId = 'monthly' | 'yearly' | 'lifetime';

export type Plan = {
  id: PlanId;
  title: string;
  price: string;
  detail: string;
  recommended?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    price: '$34.99',
    detail: 'About $2.92 / month. Default.',
    recommended: true,
  },
  {
    id: 'monthly',
    title: 'Monthly',
    price: '$4.99',
    detail: 'Cancel any month. No weekly trap.',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    price: '$79',
    detail: 'Pay once.',
  },
];
