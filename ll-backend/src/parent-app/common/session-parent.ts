/** The signed-in parent on a parent-app request (`req.parent`, set by ParentAuthGuard). */
export interface SessionParent {
  id: string;
  /** The device session (ParentSession) the access token belongs to. */
  sessionId: string;
}

/** Claims in a parent access token. `typ` keeps it apart from staff tokens and reset tokens. */
export interface ParentAccessClaims {
  sub: string;
  sid: string;
  typ: 'parent';
}

/** Claims in the short-lived token from "verify code", used once by "reset password". */
export interface ResetClaims {
  sub: string;
  rid: string;
  typ: 'reset';
}
