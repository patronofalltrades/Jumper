import { describe, expect, it } from "vitest";
import { credentialsSchema, emailSchema, isVisitorPage, needsLogin, newPasswordSchema, safeNextPath } from "@/lib/auth/rules";

describe("needsLogin", () => {
  it("lets visitors open the landing page without a log-in", () => {
    expect(needsLogin("/")).toBe(false);
  });

  it("lets visitors open the account forms and the email callback", () => {
    expect(needsLogin("/login")).toBe(false);
    expect(needsLogin("/signup")).toBe(false);
    expect(needsLogin("/auth/callback")).toBe(false);
    expect(needsLogin("/forgot-password")).toBe(false);
  });

  it("needs the reset-link session to set a new password", () => {
    expect(needsLogin("/reset-password")).toBe(true);
  });

  it("protects every other page", () => {
    for (const path of ["/lobby", "/p/perch", "/p/perch/1", "/snapshots", "/snapshots/abc", "/dashboard"]) {
      expect(needsLogin(path)).toBe(true);
    }
  });

  it("does not treat a look-alike path as public", () => {
    expect(needsLogin("/login-history")).toBe(true);
    expect(needsLogin("/signups")).toBe(true);
  });
});

describe("isVisitorPage", () => {
  it("sends a logged-in user from the landing page to the lobby", () => {
    expect(isVisitorPage("/")).toBe(true);
  });

  it("is true only for the landing page and the account forms", () => {
    expect(isVisitorPage("/login")).toBe(true);
    expect(isVisitorPage("/signup")).toBe(true);
    expect(isVisitorPage("/forgot-password")).toBe(true);
    expect(isVisitorPage("/reset-password")).toBe(false);
    expect(isVisitorPage("/auth/callback")).toBe(false);
    expect(isVisitorPage("/lobby")).toBe(false);
    expect(isVisitorPage("/p/perch")).toBe(false);
  });
});

describe("credentialsSchema", () => {
  it("accepts a valid email and password", () => {
    const result = credentialsSchema.safeParse({ email: " Ada@Example.com ", password: "breadboard" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ada@example.com");
  });

  it("gives a friendly message for a bad email", () => {
    const result = credentialsSchema.safeParse({ email: "ada", password: "breadboard" });
    expect(result.error?.flatten().fieldErrors.email).toEqual(["Enter a valid email address."]);
  });

  it("asks for a password of 8 or more characters", () => {
    const result = credentialsSchema.safeParse({ email: "ada@example.com", password: "short" });
    expect(result.error?.flatten().fieldErrors.password).toEqual(["Use 8 or more characters."]);
  });
});

describe("emailSchema", () => {
  it("accepts an email without a password", () => {
    expect(emailSchema.safeParse({ email: "ada@example.com" }).success).toBe(true);
    expect(emailSchema.safeParse({ email: "ada" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("needs 8 or more characters, typed the same twice", () => {
    expect(newPasswordSchema.safeParse({ password: "breadboard", confirm: "breadboard" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "short", confirm: "short" }).error?.flatten().fieldErrors.password)
      .toEqual(["Use 8 or more characters."]);
    expect(newPasswordSchema.safeParse({ password: "breadboard", confirm: "breadboarf" }).error?.flatten().fieldErrors.confirm)
      .toEqual(["The two passwords are not the same."]);
  });
});

describe("safeNextPath", () => {
  it("keeps a path inside the app", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
  });

  it("falls back to the lobby for a missing or outside address", () => {
    expect(safeNextPath(null)).toBe("/lobby");
    expect(safeNextPath("https://evil.example")).toBe("/lobby");
    expect(safeNextPath("//evil.example")).toBe("/lobby");
    expect(safeNextPath("/\\evil.example")).toBe("/lobby");
  });
});
