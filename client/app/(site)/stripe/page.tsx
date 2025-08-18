'use client';
import PaymentPage from '@/features/stripe';
import { useRouter } from 'next/navigation';

const Page = () => {
  const router = useRouter();
  return (
    <div className="min-h-screen  flex justify-center items-center">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Complete your payment</h1>
        <PaymentPage />
      </div>
    </div>
  );
};

export default Page;
