import { describe, it, expect } from "vitest";
import { isValidIPv4, isValidIPv6, isLocalhost, isPrivateIP, ipToNumber, isIPInCIDR, isIPInRanges, maskIP, hashIP } from "@/lib/ipUtils";

describe("ipUtils", () => {
  describe("isValidIPv4", () => {
    it("valid IPs", () => {
      expect(isValidIPv4("192.168.1.1")).toBe(true);
      expect(isValidIPv4("0.0.0.0")).toBe(true);
      expect(isValidIPv4("255.255.255.255")).toBe(true);
      expect(isValidIPv4("10.0.0.1")).toBe(true);
    });
    it("invalid IPs", () => {
      expect(isValidIPv4("256.1.1.1")).toBe(false);
      expect(isValidIPv4("1.1.1")).toBe(false);
      expect(isValidIPv4("1.1.1.1.1")).toBe(false);
      expect(isValidIPv4("abc")).toBe(false);
      expect(isValidIPv4("")).toBe(false);
    });
  });

  describe("isValidIPv6", () => {
    it("valid IPv6", () => {
      expect(isValidIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
    });
    it("invalid IPv6", () => {
      expect(isValidIPv6("192.168.1.1")).toBe(false);
      expect(isValidIPv6("not-ipv6")).toBe(false);
    });
  });

  describe("isLocalhost", () => {
    it("127.0.0.1", () => expect(isLocalhost("127.0.0.1")).toBe(true));
    it("::1", () => expect(isLocalhost("::1")).toBe(true));
    it("localhost", () => expect(isLocalhost("localhost")).toBe(true));
    it("0.0.0.0", () => expect(isLocalhost("0.0.0.0")).toBe(true));
    it("external IP", () => expect(isLocalhost("8.8.8.8")).toBe(false));
  });

  describe("isPrivateIP", () => {
    it("10.x.x.x", () => expect(isPrivateIP("10.0.0.1")).toBe(true));
    it("172.16.x.x", () => expect(isPrivateIP("172.16.0.1")).toBe(true));
    it("172.31.x.x", () => expect(isPrivateIP("172.31.255.255")).toBe(true));
    it("172.15.x.x is public", () => expect(isPrivateIP("172.15.0.1")).toBe(false));
    it("172.32.x.x is public", () => expect(isPrivateIP("172.32.0.1")).toBe(false));
    it("192.168.x.x", () => expect(isPrivateIP("192.168.1.1")).toBe(true));
    it("169.254.x.x (link-local)", () => expect(isPrivateIP("169.254.1.1")).toBe(true));
    it("public IP", () => expect(isPrivateIP("8.8.8.8")).toBe(false));
    it("invalid IP", () => expect(isPrivateIP("invalid")).toBe(false));
  });

  describe("ipToNumber", () => {
    it("converts correctly", () => {
      expect(ipToNumber("0.0.0.1")).toBe(1);
      expect(ipToNumber("0.0.1.0")).toBe(256);
      expect(ipToNumber("192.168.1.1")).toBe(3232235777);
    });
    it("invalid returns 0", () => expect(ipToNumber("invalid")).toBe(0));
  });

  describe("isIPInCIDR", () => {
    it("IP in /24 range", () => {
      expect(isIPInCIDR("192.168.1.100", "192.168.1.0/24")).toBe(true);
    });
    it("IP not in /24 range", () => {
      expect(isIPInCIDR("192.168.2.1", "192.168.1.0/24")).toBe(false);
    });
    it("IP in /16 range", () => {
      expect(isIPInCIDR("10.0.5.5", "10.0.0.0/16")).toBe(true);
    });
    it("invalid IP", () => expect(isIPInCIDR("invalid", "10.0.0.0/8")).toBe(false));
  });

  describe("isIPInRanges", () => {
    it("matches CIDR", () => {
      expect(isIPInRanges("192.168.1.5", ["192.168.1.0/24"])).toBe(true);
    });
    it("matches exact IP", () => {
      expect(isIPInRanges("8.8.8.8", ["8.8.8.8"])).toBe(true);
    });
    it("no match", () => {
      expect(isIPInRanges("1.1.1.1", ["10.0.0.0/8", "192.168.0.0/16"])).toBe(false);
    });
  });

  describe("maskIP", () => {
    it("masks last two octets", () => {
      expect(maskIP("192.168.1.100")).toBe("192.168.xxx.xxx");
    });
    it("returns invalid IP as-is", () => {
      expect(maskIP("invalid")).toBe("invalid");
    });
  });

  describe("hashIP", () => {
    it("returns hex string", async () => {
      const hash = await hashIP("192.168.1.1");
      expect(hash).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
    it("is deterministic", async () => {
      const h1 = await hashIP("10.0.0.1");
      const h2 = await hashIP("10.0.0.1");
      expect(h1).toBe(h2);
    });
    it("different IPs = different hashes", async () => {
      const h1 = await hashIP("10.0.0.1");
      const h2 = await hashIP("10.0.0.2");
      expect(h1).not.toBe(h2);
    });
  });
});
