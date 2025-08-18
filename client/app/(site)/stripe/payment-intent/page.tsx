"use client";
import { stripePromise } from "@/config";
import { useCreatePaymentIntent } from "@/features/stripe/api";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";
import React, { useState } from "react";
import { toast } from "sonner";

interface PaymentIntentFormProps {
  amount: number;
  currency?: string;
  customerId?: string;
  onSuccess?: (paymentIntent: any) => void;
}

const PaymentForm: React.FC<PaymentIntentFormProps> = ({
  amount = 100,
  currency = "usd",
  customerId = "cus_123",
  onSuccess,
}) => {
  const stripe = useStripe();
  const { theme, themes } = useTheme();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { handleCreatePaymentIntent } = useCreatePaymentIntent();
  console.log(theme, themes, "Colro theme");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      // Create Payment Intent

      const { data, message } = await handleCreatePaymentIntent({
        currency,
        customer: customerId,

        amount,
      });
      if (!data?.clientSecret) {
        toast.error(message);
        setError(message);
        return;
      }
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (onSuccess) onSuccess(paymentIntent);
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6  rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border rounded-md p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: theme === "dark" ? "#ffffff" : "#2b2a2a",
                },
              },
            }}
          />
        </div>

        {error && <div className="text-red-500">{error}</div>}

        <button
          type="submit"
          disabled={!stripe || loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : `Pay ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`}
        </button>
      </form>
    </div>
  );
};

const PaymentIntentForm: React.FC<PaymentIntentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default PaymentIntentForm;
