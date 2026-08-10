import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";

/** Route Google users to claim / pending / home after OAuth */
export default async function AuthContinuePage() {
  const state = await getAuthState();

  if (state.status === "anonymous") {
    redirect("/login");
  }
  if (state.status === "unclaimed") {
    redirect("/claim");
  }
  if (state.status === "pending") {
    redirect("/pending");
  }
  redirect("/");
}
