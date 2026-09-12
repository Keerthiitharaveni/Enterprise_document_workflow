import ApproverQueue from "@/app/components/ApproverQueue";

export const dynamic = "force-dynamic";

export default function ManagerQueuePage() {
  return <ApproverQueue roleKey="manager" basePath="/manager/requests" />;
}
