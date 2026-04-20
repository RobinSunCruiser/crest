/**
 * @module Hooks/usePersistedState
 */

import { useEffect, useState } from 'react';

/**
 * Custom hook for managing state that persists across page reloads.
 *
 * @param key - The key to use when storing and retrieving the state in local storage. This should be a unique string.
 * @param defaultValue - The default value to use if no persisted state is found. This can be any type of value, including objects and arrays.
 * @returns An array containing two values:
 *   - `state`: The current persisted state, which will be updated whenever the component re-renders.
 *   - `setState`: A function that can be used to update the persisted state.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
    /**
     * Initializes the state by checking for a persisted value in local storage.
     * If a persisted value is found, it is parsed as JSON and used as the initial state.
     * Otherwise, the default value is used.
     */
    const [state, setState] = useState<T>(() => {
        const persistedState = localStorage.getItem(key);
        return persistedState ? (JSON.parse(persistedState) as T) : defaultValue;
    });

    /**
     * Effect that updates local storage with the current state whenever it changes.
     */
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState] as const;
}
