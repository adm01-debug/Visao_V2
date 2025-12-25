export interface StoreState { [key: string]: any; }
export type StoreAction<T = any> = { type: string; payload?: T; };
export type StoreReducer<S, A> = (state: S, action: A) => S;
export type StoreMiddleware<S> = (store: StoreAPI<S>) => (next: Dispatch) => (action: StoreAction) => any;
export type Dispatch = (action: StoreAction) => void;

export interface StoreAPI<S> { getState: () => S; dispatch: Dispatch; subscribe: (listener: () => void) => () => void; }

export interface StoreConfig<S> { initialState: S; reducer: StoreReducer<S, StoreAction>; middleware?: StoreMiddleware<S>[]; devTools?: boolean; }

export type Selector<S, R> = (state: S) => R;
export type EqualityFn<T> = (a: T, b: T) => boolean;
