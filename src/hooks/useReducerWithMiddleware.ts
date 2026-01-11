import { useReducer, useRef, useCallback, Dispatch } from 'react';

type Middleware<S, A> = (
  store: { getState: () => S; dispatch: Dispatch<A> }
) => (next: Dispatch<A>) => (action: A) => void;

export function useReducerWithMiddleware<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  middlewares: Middleware<S, A>[] = []
): [S, Dispatch<A>] {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const enhancedDispatch = useCallback((action: A) => {
    const store = {
      getState: () => stateRef.current,
      dispatch: (a: A) => dispatch(a),
    };

    const chain = middlewares.map((middleware) => middleware(store));
    
    const composedDispatch = chain.reduceRight(
      (next, middleware) => middleware(next),
      dispatch
    );

    composedDispatch(action);
  }, [middlewares]);

  return [state, enhancedDispatch];
}

// Logger Middleware
export const loggerMiddleware: Middleware<any, any> = (store) => (next) => (action) => {
  if (import.meta.env.DEV) console.group(action.type || 'Action');
  );
    next(action);
  );
  if (import.meta.env.DEV) console.groupEnd();
};

// Thunk Middleware
export const thunkMiddleware: Middleware<any, any> = (store) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};

export default useReducerWithMiddleware;
