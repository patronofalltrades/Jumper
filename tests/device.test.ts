import { describe, expect, it } from "vitest";
import { deviceKind, PHONE_MAX_WIDTH } from "@/lib/device";

describe("deviceKind", () => {
  it("calls a phone screen a phone", () => {
    expect(deviceKind(390)).toBe("phone");
  });

  it("calls a narrow laptop window a phone, because the phone layout fits it", () => {
    expect(deviceKind(500)).toBe("phone");
  });

  it("calls a laptop screen a laptop", () => {
    expect(deviceKind(1440)).toBe("laptop");
  });

  it("changes at the same width as the Tailwind sm: layouts (640 px)", () => {
    expect(PHONE_MAX_WIDTH).toBe(639);
    expect(deviceKind(639)).toBe("phone");
    expect(deviceKind(640)).toBe("laptop");
  });
});
