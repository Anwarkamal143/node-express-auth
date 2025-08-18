'use client';
import ButtonLoader from '@/components/ButtonLoader';
import { ThemeToggle } from '@/components/theme-toggle';
import '@/polyfill';

import { useRouter } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  return (
    <div className="min-h-screen  flex justify-center ">
      <div className=" mx-auto w-full">
        <div className="flex justify-center space-x-2">
          <ThemeToggle />
          <div className="flex justify-center space-x-2">
            <ButtonLoader
              variant={'outline'}
              onClick={() => {
                router.push('/stripe/customer');
              }}
            >
              Customrs
            </ButtonLoader>
            <ButtonLoader
              variant={'outline'}
              onClick={() => {
                router.push('/stripe/payment-intent');
              }}
            >
              Payment Intent
            </ButtonLoader>
            <ButtonLoader
              variant={'outline'}
              onClick={() => {
                router.push('/stripe/subscription');
              }}
            >
              Subscription
            </ButtonLoader>
            <ButtonLoader
              variant={'outline'}
              onClick={() => {
                router.push('/stripe/checkout-form');
              }}
            >
              Checkout Form
            </ButtonLoader>
          </div>
        </div>
        <div className="w-full h-full ">{children}</div>
      </div>
    </div>
  );
}
