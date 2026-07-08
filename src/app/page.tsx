import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";

// Landing: send authenticated users to the dashboard, everyone else to login.
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
