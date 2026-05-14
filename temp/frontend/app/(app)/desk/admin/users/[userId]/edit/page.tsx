import { UserUpsertPage } from "../../../../../../../features/auth/interface/pages/users-pages";

export default async function AdminUserEditPage({
  params,
}: {
  readonly params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <UserUpsertPage userId={userId} />;
}
