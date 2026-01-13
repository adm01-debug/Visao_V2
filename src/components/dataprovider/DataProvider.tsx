import React, { createContext, useContext } from 'react';interface DataProviderProps<T> { data: T; children: React.ReactNode; }
const DataContext = createContext<unknown>(null);
export function DataProvider<T>({ data, children }: DataProviderProps<T>) { return <DataContext.Provider value={data}>{children}</DataContext.Provider>; }
export function useData<T>() { return useContext(DataContext) as T; }
export default DataProvider;