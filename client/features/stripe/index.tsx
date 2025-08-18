"use client";
import { stripePromise } from "@/config";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { toast } from "sonner";
import { useCreatePaymentIntent } from "./api";

export const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { handleCreatePaymentIntent } = useCreatePaymentIntent();
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create Payment Intent
      const response = await handleCreatePaymentIntent({
        amount: 100,
        currency: "usd",
      });

      const { data } = response;
      if (!data?.clientSecret) {
        toast.error("Payment Intent not created");
        return;
      }
      // Confirm the payment
      const { error: stripeError } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
      } else {
        setPaymentSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto  rounded shadow">
      <CardElement className="p-2 border rounded mb-4" />
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {paymentSuccess && (
        <div className="text-green-500 mb-4">Payment successful!</div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? "Processing..." : "Pay $10.00"}
      </button>
    </form>
  );
};

const PaymentPage = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default PaymentPage;
