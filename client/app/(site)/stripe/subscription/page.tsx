'use client';
import { stripePromise } from '@/config';
import { useCreateSubscription } from '@/features/stripe/api/useCreateSubscription';
import { useListProducts } from '@/features/stripe/api/useProductList';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import React, { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    id: string;
    unit_amount: number;
    currency: string;
  };
}

interface SubscriptionPlansProps {
  customerId?: string;
  onSuccess?: (subscription: any) => void;
}

const SubscriptionForm: React.FC<
  SubscriptionPlansProps & { plans: Plan[] }
> = ({ customerId, plans, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { handleCreateSubscription } = useCreateSubscription();
  const handleSubscribe = async () => {
    if (!selectedPlan || !stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Create subscription
      const { data } = await handleCreateSubscription({
        customerId: customerId,
        priceId: selectedPlan.price.id,
      });
      // Confirm payment if needed
      //   const { error: stripeError } = await stripe.confirmCardPayment(
      //     data.clientSecret,
      //     {
      //       payment_method: {
      //         card: elements.getElement(CardElement)!,
      //       },
      //     }
      //   );

      //   if (stripeError) {
      //     throw new Error(stripeError.message);
      //   }

      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-lg p-4 cursor-pointer ${
              selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <p className="text-gray-600">
              ${(plan.price.unit_amount / 100).toFixed(2)} / month
            </p>
            <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <>
          <div className="border rounded-md p-4">
            <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <button
            onClick={handleSubscribe}
            disabled={!stripe || loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Subscribe'}
          </button>
        </>
      )}
    </div>
  );
};

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  customerId,
  onSuccess,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);

  const { data, isLoading, error } = useListProducts();
  useEffect(() => {
    if (!isLoading && data?.data?.length) {
      setPlans(
        data.data.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description as string,
          price: product.default_price as any,
        }))
      );
    }
  }, [isLoading]);

  if (isLoading) return <div>Loading plans...</div>;
  if (error) return <div className="text-red-500">{error?.data?.message}</div>;

  return (
    <Elements stripe={stripePromise}>
      <SubscriptionForm
        customerId={customerId}
        plans={plans}
        onSuccess={onSuccess}
      />
    </Elements>
  );
};

export default SubscriptionPlans;
