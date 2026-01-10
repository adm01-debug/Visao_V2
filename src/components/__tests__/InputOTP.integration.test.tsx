import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("InputOTP Integration", () => {
  it("should render input OTP", async () => {
    const OTP = await import("../ui/input-otp");
    
    const { container } = render(
      <OTP.InputOTP maxLength={6}>
        <OTP.InputOTPGroup>
          <OTP.InputOTPSlot index={0} />
          <OTP.InputOTPSlot index={1} />
          <OTP.InputOTPSlot index={2} />
        </OTP.InputOTPGroup>
      </OTP.InputOTP>
    );

    expect(container).toBeTruthy();
  });
});

