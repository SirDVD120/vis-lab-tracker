import { switchAccountAction } from "@/actions/auth";
import type { User } from "@/generated/prisma/client";
import { roleLabel } from "@/lib/format";

export function AccountSwitcher({
  users,
  activeUserId,
}: {
  users: User[];
  activeUserId: string | null;
}) {
  return (
    <div className="account-switcher">
      {users.map((user) => (
        <form key={user.id} action={switchAccountAction}>
          <input type="hidden" name="userId" value={user.id} />
          <button
            type="submit"
            className={`account-chip ${activeUserId === user.id ? "is-active" : ""}`}
            title={`${roleLabel(user.role)}${user.canSignOut ? " · can sign out" : ""}`}
          >
            {user.name}
          </button>
        </form>
      ))}
    </div>
  );
}
