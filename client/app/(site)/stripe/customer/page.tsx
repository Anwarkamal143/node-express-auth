"use client";
import CustomerForm from "@/features/stripe/components/createCustomer";
import CustomerList from "@/features/stripe/components/customerList";

const CustomersPage = () => {
  return (
    <div className="w-full">
      <CustomerForm />
      <CustomerList />
    </div>
  );
};

export default CustomersPage;
