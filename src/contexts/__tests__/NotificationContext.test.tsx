import{describe,it,expect}from"vitest";import{render,screen}from"@testing-library/react";import{NotificationProvider,useNotifications}from"../NotificationContext";
function TestComponent(){const{addNotification}=useNotifications();return<button onClick={()=>addNotification({type:"success",message:"Test"})}>Add</button>;}
describe("NotificationContext",()=>{it("provides notifications",()=>{render(<NotificationProvider><TestComponent/></NotificationProvider>);expect(screen.getByText("Add")).toBeTruthy();});});
