import { createAuthClient } from "better-auth/react";

// Sem baseURL: o better-auth usa a origem atual da página (window.location.origin),
// evitando porta/host errados quando o dev server sobe em outra porta.
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
