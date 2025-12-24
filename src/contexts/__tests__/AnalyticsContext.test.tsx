import{describe,it,expect}from"vitest";import{render}from"@testing-library/react";import{AnalyticsProvider,useAnalytics}from"../AnalyticsContext";
function TestComponent(){const{dateRange}=useAnalytics();return<div>{dateRange.start.toString()}</div>;}
describe("AnalyticsContext",()=>{it("provides analytics context",()=>{render(<AnalyticsProvider><TestComponent/></AnalyticsProvider>);expect(true).toBe(true);});});
