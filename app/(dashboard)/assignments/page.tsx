import { createClient } from "@/lib/supabase/server";
import { AssignmentsView } from "@/components/assignments/assignments-view";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AssignmentsView userEmail={user?.email || ""} />;
}
