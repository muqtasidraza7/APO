import { createClient } from "../../../../../utils/supabase/server";
import { redirect } from "next/navigation";
import AllocationClient from "./AllocationClient";

export default async function AllocationPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  return <AllocationClient />;
}
