import{describe,it,expect}from"vitest";import{playAlertSound}from"../alertSounds";describe("alertSounds",()=>{it("exports playAlertSound",()=>{expect(typeof playAlertSound).toBe("function");});});
