import Form from "@/components/form/Form";
import FormInput from "@/components/form/Input";
import { useCreateCustomer } from "@/features/stripe/api/useCreateCustomer";
import {
  STRIPE_CREATE_CUSTOMER_SCHEMA,
  StripeCreateCustomer,
} from "@/features/stripe/schema";
import useZodForm from "@/hooks/useZodForm";
import { useState } from "react";
import { toast } from "sonner";

interface CustomerFormProps {
  onSuccess?: (customer: any) => void;
}

const CustomerForm = ({ onSuccess }: CustomerFormProps) => {
  const [error, setError] = useState("");
  const { handleCreateCustomer, isPending } = useCreateCustomer();

  const form = useZodForm({
    schema: STRIPE_CREATE_CUSTOMER_SCHEMA,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const handleSubmit = async (e: StripeCreateCustomer) => {
    console.log(e, "e");
    setError("");

    const { data, message, success } = await handleCreateCustomer(e);

    if (onSuccess && success) onSuccess(data);
    if (!success) {
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col items-center w-full pt-4">
      <h1 className="font-bold text-muted-foreground text-xl">
        Create stripe customer
      </h1>
      <Form
        form={form}
        onSubmit={handleSubmit}
        className="space-y-4 flex flex-col   mx-auto w-full max-w-3xl pt-2"
      >
        {error && <div className="text-red-500">{error}</div>}

        <FormInput
          label="Email"
          name="email"
          type="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />

        <FormInput
          label="Name"
          name="name"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />

        <FormInput
          label="phone"
          name="phone"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Customer"}
        </button>
      </Form>
    </div>
  );
};

export default CustomerForm;
