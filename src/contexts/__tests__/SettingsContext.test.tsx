import{describe,it,expect}from"vitest";import{render,screen}from"@testing-library/react";import{SettingsProvider,useSettings}from"../SettingsContext";
function TestComponent(){const{settings}=useSettings();return<div>{settings.language}</div>;}
describe("SettingsContext",()=>{it("provides settings",()=>{render(<SettingsProvider><TestComponent/></SettingsProvider>);expect(screen.getByText("pt-BR")).toBeTruthy();});});
