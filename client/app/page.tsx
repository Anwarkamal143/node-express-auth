"use client";

import ButtonLoader from "@/components/ButtonLoader";
import { ThemeToggle } from "@/components/theme-toggle";
import { API_BASE_URL } from "@/config";
import { useSignOut } from "@/features/auth/api";
import { useStoreUser } from "@/store/userAuthStore";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { signOut } = useSignOut();
  const store = useStoreUser();

  const handleGoogleLogin = async () => {
    // await signInWithGoogle();
    window.location.href = `${API_BASE_URL}/google`;
  };
  return (
    <div className="flex justify-center items-center h-full space-x-2">
      <ThemeToggle />
      <ButtonLoader onClick={handleGoogleLogin}>google</ButtonLoader>
      <ButtonLoader
        onClick={() => {
          router.push("/server");
        }}
      >
        server
      </ButtonLoader>
      <ButtonLoader
        onClick={async () => {
          await signOut(true);
        }}
      >
        logout
      </ButtonLoader>
      <ButtonLoader
        onClick={async () => {
          router.push("/dashboard");
        }}
      >
        Admin
      </ButtonLoader>
      <div className="text-muted-foreground">{store ? store.name : null}</div>
    </div>
  );
}
