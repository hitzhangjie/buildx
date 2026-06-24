import { apiFetch } from "./client";

export type InvitationStatus = "pending" | "accepted" | "expired";

export type Invitation = {
  id: number;
  emailAddress: string;
  status: InvitationStatus;
  createdAt?: string;
};

export type CreateInvitationsRequest = {
  emailAddresses: string[];
  role?: string;
};

export async function listInvitations(): Promise<Invitation[]> {
  try {
    return await apiFetch<Invitation[]>("/~api/invitations");
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}

export async function createInvitations(request: CreateInvitationsRequest): Promise<void> {
  await apiFetch<void>("/~api/invitations", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function resendInvitation(invitationId: number): Promise<void> {
  await apiFetch<void>(`/~api/invitations/${invitationId}/resend`, {
    method: "POST",
  });
}

export async function deleteInvitation(invitationId: number): Promise<void> {
  await apiFetch<void>(`/~api/invitations/${invitationId}`, {
    method: "DELETE",
  });
}
