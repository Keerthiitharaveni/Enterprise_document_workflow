import ApproverQueue from "@/app/components/ApproverQueue";

export const dynamic = "force-dynamic";

export default function FinanceQueuePage() {
  return <ApproverQueue roleKey="finance" basePath="/finance/requests" />;
}
