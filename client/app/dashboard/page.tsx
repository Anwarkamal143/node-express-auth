"use client";
import ButtonLoader from "@/components/ButtonLoader";
import { useSignOut } from "@/features/auth/api";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { signOut } = useSignOut();
  const router = useRouter();
  return (
    <div className={cn("flex space-x-3 h-full justify-center items-center")}>
      Dashboard
      <ButtonLoader onClick={() => router.push("/")}>Client</ButtonLoader>
      <ButtonLoader
        onClick={async () => {
          await signOut(true);
        }}
      >
        logout
      </ButtonLoader>
    </div>
  );
}
