import { UserShowPage } from "../../../../../../features/auth/interface/pages/user-show-page";

export default async function AdminUserShowPage({
  params,
}: {
  readonly params: Promise<{ readonly userId: string }>;
}) {
  const { userId } = await params;
  return <UserShowPage userId={userId} />;
}
