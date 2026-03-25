import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

// Guest mode: no auth tokens needed
// TODO: When adding Firebase auth, replace this with:
// import { getAuth } from 'firebase/auth';
// const auth = getAuth();
// setAuthTokenGetter(() => auth.currentUser?.getIdToken() ?? null);
setAuthTokenGetter(() => null);
