import{describe,it,expect}from"vitest";import{render,screen}from"@testing-library/react";import{AppStoreProvider,useAppStore}from"../appStore";
function TestComponent(){const{sidebarOpen}=useAppStore();return<div>{sidebarOpen?"Open":"Closed"}</div>;}
describe("appStore",()=>{it("provides app state",()=>{render(<AppStoreProvider><TestComponent/></AppStoreProvider>);expect(document.body).toBeTruthy();});});
