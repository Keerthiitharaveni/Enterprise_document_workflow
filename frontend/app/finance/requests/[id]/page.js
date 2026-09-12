import ApproverDetail from "@/app/components/ApproverDetail";

export const dynamic = "force-dynamic";

export default function FinanceRequestDetail({ params }) {
  return <ApproverDetail id={params.id} roleKey="finance" basePath="/finance" />;
}
