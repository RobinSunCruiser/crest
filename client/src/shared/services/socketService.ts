/**
 * @module Services/SocketService
 *
 * This module provides WebSocket communication functionality for the application using Socket.IO.
 * It handles connection management, authentication, event listening, and message sending
 * between the client and server.
 *
 * The module exports:
 * - SocketService class: Manages WebSocket connections and communication
 * - EventEmitter class: Provides a simple event system for internal event handling
 * - A singleton instance of SocketService for application-wide use
 */

import { io, Socket } from 'socket.io-client';
import { AuthMessage, EVENTS, SocketMessage } from '@root/server/src/socket/apiObjects';
import { getBasePath } from '@/shared/utils/basePath';
import { STORAGE_KEYS } from '@/shared/constants/storage';

// Type definitions for better maintainability
type AuthChangeCallback = (isAuthenticated: boolean) => void;
type ConnectionChangeCallback = (connected: boolean, error?: Error) => void;

/**
 * Service class for managing WebSocket connections and communication with the server.
 * Handles connection setup, authentication, event handling, and message sending.
 */
export class SocketService {
    /** The socket.io Socket instance used for the WebSocket connection */
    private socket: Socket | null = null;

    /** EventEmitter instance to manage custom event listeners */
    private eventEmitter = new EventEmitter();

    /** Internal authentication state */
    private _isAuthenticated: boolean = false;
    private _connectionError: Error | null = null;
    private _authChangeCallbacks: AuthChangeCallback[] = [];
    private _connectionChangeCallbacks: ConnectionChangeCallback[] = [];

    /**
     * Initializes the SocketService, establishing a connection to the server.
     * Automatically attempts to authenticate using any token stored in localStorage.
     */
    constructor() {
        this.connect();
    }

    /**
     * Establishes a WebSocket connection to the server and sets up event handlers.
     * Uses any existing authentication token from localStorage.
     *
     * In development mode, connects to the default host.
     * In production, connects to the current host.
     *
     * @returns {void}
     *
     * @example
     * ```typescript
     * // Create a new connection
     * socketService.connect();
     * ```
     */
    public connect() {
        try {
            // Retrieve any stored authentication token
            const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            let token = null;
            
            if (storedToken) {
                try {
                    // Try to parse as JSON first (new format)
                    token = JSON.parse(storedToken);
                } catch {
                    // If parsing fails, treat as plain string (legacy format)
                    token = storedToken;
                }
            }

            // Determine connection URL based on environment mode
            const mode = import.meta.env.MODE;
            const url = mode === 'development' ? '' : document.location.protocol + '//' + document.location.host;

            // Get base path for socket.io connection
            // Detects deployment path at runtime (e.g., '/crest/' or '/')
            // This ensures socket connects correctly regardless of which route user accesses first
            const basePath = getBasePath();

            // Create the socket connection with options
            const authConfig = token ? { auth: { token } } : {};


            this.socket = io(url, {
                ...authConfig,
                reconnection: true,
                reconnectionDelay: 2000,
                path: basePath + 'socket.io/',
            });

            // Set up event handlers for the socket
            this.setupEventHandlers();
        } catch (error) {
            console.error('Error connecting to socket:', error);
        }
    }

    /**
     * Sets up internal event handlers for the socket connection.
     * Maps socket.io events to the internal EventEmitter system.
     *
     * Handles basic connection events:
     * - connect: Emitted when connection is established
     * - connect_error: Emitted when connection fails
     * - disconnect: Emitted when connection is closed
     *
     * Also sets up a catch-all handler for other socket events.
     *
     * @private
     */
    private setupEventHandlers() {
        if (!this.socket) return;

        // Handle successful connection
        this.socket.on('connect', () => {
            this._connectionError = null;
            this._notifyConnectionChange(true);
            this.eventEmitter.emit(EVENTS.CONNECT);

            // Auto-authenticate with stored token if available
            const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (storedToken) {
                let token;
                try {
                    // Try to parse as JSON first (new format)
                    token = JSON.parse(storedToken);
                } catch {
                    // If parsing fails, treat as plain string (legacy format)
                    token = storedToken;
                }
                if (token) {
                    this.auth(token);
                }
            }
        });

        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            
            this._connectionError = error;
            this._notifyConnectionChange(false, error);
            this.eventEmitter.emit(EVENTS.CONNECT_ERROR, error);
        });

        // Handle disconnection
        this.socket.on('disconnect', () => {
            this._notifyConnectionChange(false);
            this.eventEmitter.emit(EVENTS.DISCONNECT);
        });

        // Handle authentication responses internally
        this.socket.on(EVENTS.AUTH_RESPONSE, (message: any) => {
            if (message.data.success) {
                this._setAuthenticated(true);
            } else {
                this._setAuthenticated(false);
                localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            }
        });

        // Handle unauthorized events internally
        this.socket.on(EVENTS.UNAUTHORIZED, () => {
            this._setAuthenticated(false);
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        });

        // Catch all other events and forward them to the event emitter
        this.socket.onAny((event, ...args) => {
            // Skip debug logging for streaming chunk responses to reduce console noise
            if (process.env.NODE_ENV === 'development' && event !== EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE) {
                // Debug log for received socket messages only in development
                console.debug(`🔽 Socket RECEIVED:`, {
                    event,
                    data: args.length === 1 ? args[0] : args,
                    timestamp: new Date().toISOString()
                });
            }
            
            this.eventEmitter.emit(event, ...args);
        });
    }

    /**
     * Sends an authentication message to the server with the provided token.
     * This method should be called after login or token refresh.
     *
     * @param token - The authentication token to send to the server
     *
     * @example
     * ```typescript
     * // After successful login, authenticate the socket connection
     * function handleLogin(loginResponse) {
     *   const { token } = loginResponse;
     *   socketService.auth(token);
     * }
     * ```
     */
    public auth(token: string) {
        const authMessage: AuthMessage = {
            event: EVENTS.AUTH,
            version: '0.1.0',
            data: {
                token: token,
            },
        };

        if (this.socket) {
            this.socket.emit(authMessage.event, authMessage);
        }
    }

    /**
     * Sends an authentication message to the server with username and password.
     * This method handles credential-based authentication and returns a Promise
     * that resolves when the authentication response is received.
     *
     * @param username - The username for authentication
     * @param password - The password for authentication
     * @returns Promise that resolves with the authentication response
     *
     * @example
     * ```typescript
     * // Login with username and password
     * try {
     *   const response = await socketService.login('username', 'password');
     *   if (response.success) {
     *     console.log('Login successful, token:', response.token);
     *   } else {
     *     console.log('Login failed');
     *   }
     * } catch (error) {
     *   console.error('Login error:', error);
     * }
     * ```
     */
    public login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: any }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            const authMessage: AuthMessage = {
                event: EVENTS.AUTH,
                version: '0.1.0',
                data: {
                    username: username,
                    password: password,
                },
            };

            // Set up one-time listener for the authentication response
            const handleAuthResponse = (response: any) => {
                if (response.event === EVENTS.AUTH_RESPONSE) {
                    if (response.data.success) {
                        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(response.data.token));
                        this._setAuthenticated(true);
                        resolve({
                            success: true,
                            token: response.data.token,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.error || { message: 'Authentication failed' },
                        });
                    }
                }
            };

            // Listen for the authentication response
            this.socket.once(EVENTS.AUTH_RESPONSE, handleAuthResponse);

            // Send the authentication message
            this.socket.emit(authMessage.event, authMessage);

            // Set a timeout to reject the promise if no response is received
            setTimeout(() => {
                this.socket?.off(EVENTS.AUTH_RESPONSE, handleAuthResponse);
                reject(new Error('Authentication timeout'));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Verifies a JWT token with the server via Socket.IO.
     * This method handles token verification and returns a Promise
     * that resolves when the authentication response is received.
     *
     * @param token - The JWT token to verify
     * @returns Promise that resolves with the verification response
     *
     * @example
     * ```typescript
     * // Verify a token
     * try {
     *   const response = await socketService.verifyToken('jwt_token_here');
     *   if (response.success) {
     *     console.log('Token is valid');
     *   } else {
     *     console.log('Token is invalid');
     *   }
     * } catch (error) {
     *   console.error('Verification error:', error);
     * }
     * ```
     */
    public verifyToken(token: string): Promise<{ success: boolean; error?: any }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            const authMessage: AuthMessage = {
                event: EVENTS.AUTH,
                version: '0.1.0',
                data: {
                    token: token,
                },
            };

            // Set up one-time listener for the authentication response
            const handleAuthResponse = (response: any) => {
                if (response.event === EVENTS.AUTH_RESPONSE) {
                    if (response.data.success) {
                        resolve({
                            success: true,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.error || { message: 'Token verification failed' },
                        });
                    }
                }
            };

            // Listen for the authentication response
            this.socket.once(EVENTS.AUTH_RESPONSE, handleAuthResponse);

            // Send the authentication message
            this.socket.emit(authMessage.event, authMessage);

            // Set a timeout to reject the promise if no response is received
            setTimeout(() => {
                this.socket?.off(EVENTS.AUTH_RESPONSE, handleAuthResponse);
                reject(new Error('Token verification timeout'));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Disconnects the WebSocket connection and clears the socket instance.
     * This should be called when the user logs out or the application is shutting down.
     *
     * @example
     * ```typescript
     * // When user logs out
     * function handleLogout() {
     *   socketService.disconnect();
     *   // Clear user data, redirect to login, etc.
     * }
     * ```
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this._setAuthenticated(false);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    // ===== PUBLIC API - CONNECTION MANAGEMENT =====

    /**
     * Returns current connection state (derived from socket.connected)
     */
    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Returns current connection error if any
     */
    public getConnectionError(): Error | null {
        return this._connectionError;
    }

    /**
     * Subscribe to connection state changes
     */
    public onConnectionChange(callback: ConnectionChangeCallback): void {
        this._connectionChangeCallbacks.push(callback);
    }

    /**
     * Unsubscribe from connection state changes
     */
    public offConnectionChange(callback: ConnectionChangeCallback): void {
        this._connectionChangeCallbacks = this._connectionChangeCallbacks.filter(cb => cb !== callback);
    }

    // ===== PUBLIC API - AUTHENTICATION MANAGEMENT =====

    /**
     * Returns current authentication state
     */
    public isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    /**
     * Subscribe to authentication state changes
     */
    public onAuthChange(callback: AuthChangeCallback): void {
        this._authChangeCallbacks.push(callback);
    }

    /**
     * Unsubscribe from authentication state changes
     */
    public offAuthChange(callback: AuthChangeCallback): void {
        this._authChangeCallbacks = this._authChangeCallbacks.filter(cb => cb !== callback);
    }

    /**
     * Logout and clear authentication state
     */
    public logout(): void {
        this._setAuthenticated(false);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        // Clear persisted analysis and conversation data
        localStorage.removeItem(STORAGE_KEYS.ANALYSIS_STATE);
        // Optionally notify server of logout
    }

    // ===== PUBLIC API - EVENT SYSTEM =====

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Sets authentication state and notifies callbacks
     */
    private _setAuthenticated(isAuthenticated: boolean): void {
        if (this._isAuthenticated !== isAuthenticated) {
            this._isAuthenticated = isAuthenticated;
            this._authChangeCallbacks.forEach(callback => callback(isAuthenticated));
        }
    }

    /**
     * Notifies connection state callbacks
     */
    private _notifyConnectionChange(connected: boolean, error?: Error): void {
        this._connectionChangeCallbacks.forEach(callback => callback(connected, error));
    }

    /**
     * Registers an event listener for a specific socket event.
     * The callback will be executed whenever the specified event is received.
     *
     * @param event - The event name to listen for from the EVENTS enum
     * @param callback - The function to be executed when the event is emitted
     *
     * @example
     * ```typescript
     * // Listen for model list updates
     * socketService.on(EVENTS.LLM_LIST_UPDATE, (modelData) => {
     *   updateModelsList(modelData.data.models);
     * });
     *
     * // Listen for connection status changes
     * socketService.on(EVENTS.CONNECT, () => {
     *   showConnectedStatus();
     * });
     * ```
     */
    public on(event: EVENTS, callback: (...args: any[]) => void) {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Removes an event listener for a specific socket event.
     * If no callback is provided, removes all listeners for the event.
     *
     * @param event - The event name to stop listening for
     * @param callback - The specific function to remove, or undefined to remove all listeners
     *
     * @example
     * ```typescript
     * // Define a handler
     * const handleModelUpdate = (modelData) => {
     *   updateModelsList(modelData.data.models);
     * };
     *
     * // Add the handler
     * socketService.on(EVENTS.LLM_LIST_UPDATE, handleModelUpdate);
     *
     * // Later, remove the specific handler
     * socketService.off(EVENTS.LLM_LIST_UPDATE, handleModelUpdate);
     *
     * // Or remove all handlers for the event
     * socketService.off(EVENTS.LLM_LIST_UPDATE);
     * ```
     */
    public off(event: EVENTS, callback?: (...args: any[]) => void) {
        if (!callback) {
            this.eventEmitter.off(event);
            return;
        }
        this.eventEmitter.off(event, callback);
    }

    /**
     * Sends a message over the WebSocket connection.
     * Messages must follow the `SocketMessage` interface structure.
     *
     * @param message - The message to send, which must follow the `SocketMessage` structure
     *
     * @example
     * ```typescript
     * // Send a request to list available models
     * socketService.send({
     *   event: EVENTS.LLM_LIST_REQUEST,
     *   version: "0.1.0",
     *   payload: { requestID: uuidv4() }
     * });
     *
     * // Send a chat message
     * socketService.send({
     *   event: EVENTS.LLM_CHAT_REQUEST,
     *   version: "0.1.0",
     *   data: {
     *     modelID: "gpt-4",
     *     messages: messageHistory
     *   },
     *   payload: { requestID: uuidv4(), conversationID: "main-chat" }
     * });
     * ```
     */
    public send(message: SocketMessage) {
        if (this.socket) {
            // Debug log for sent socket messages in development only
            if (process.env.NODE_ENV === 'development') {
                console.debug(`🔼 Socket SENT:`, {
                    event: message.event,
                    data: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            this.socket.emit(message.event, message);
        } else {
            console.error('ERROR: Cannot send message. Socket is disconnected');
        }
    }
}

/**
 * A simple event emitter implementation for internal event handling.
 * Provides methods to register event listeners, remove them, and emit events.
 */
export class EventEmitter {
    /** Records storing event listeners organized by event name */
    private events: Record<string, ((...args: any[]) => void)[]>;

    /**
     * Creates a new EventEmitter instance with an empty events object.
     */
    constructor() {
        this.events = {};
    }

    /**
     * Registers a listener function for a specified event.
     * Multiple listeners can be registered for the same event.
     *
     * @param event - The event name to listen for
     * @param listener - The function to execute when the event is emitted
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Register a listener for 'message' events
     * emitter.on('message', (data) => {
     *   console.log('Message received:', data);
     * });
     * ```
     */
    on(event: string | number, listener: (...args: any[]) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * Triggers all listener functions registered for the specified event.
     * Passes all provided arguments to each listener.
     *
     * @param event - The event name to emit
     * @param args - Arguments to pass to each listener function
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Register a listener
     * emitter.on('userUpdate', (userId, data) => {
     *   updateUserProfile(userId, data);
     * });
     *
     * // Emit the event with arguments
     * emitter.emit('userUpdate', 123, { name: 'New Name' });
     * ```
     */
    emit(event: string | number, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach((listener) => listener(...args));
        }
    }

    /**
     * Removes a listener function from an event, or all listeners if no specific function is provided.
     *
     * @param event - The event name to remove listeners from
     * @param listener - The specific listener function to remove, or undefined to remove all listeners
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter();
     *
     * // Define a handler function
     * const handleMessage = (msg) => console.log(msg);
     *
     * // Register the handler
     * emitter.on('message', handleMessage);
     *
     * // Remove the specific handler
     * emitter.off('message', handleMessage);
     *
     * // Or remove all handlers for the event
     * emitter.off('message');
     * ```
     */
    off(event: string | number, listener?: (...args: any[]) => void) {
        if (!this.events[event]) return;

        if (!listener) {
            delete this.events[event];
            return;
        }

        this.events[event] = this.events[event].filter((l) => l !== listener);
    }
}

/**
 * Singleton instance of the SocketService class for use throughout the application.
 * Use this instance to connect to the server, listen for events, and send messages.
 *
 * @example
 * ```typescript
 * import { socketService } from '@/shared/services';
 *
 * // Listen for connection events
 * socketService.on(EVENTS.CONNECT, () => {
 *   console.log('Connected to server!');
 * });
 *
 * // Send a message
 * socketService.send({
 *   event: EVENTS.CUSTOM_EVENT,
 *   version: '0.1.0',
 *   data: { message: 'Hello server!' }
 * });
 * ```
 */
const socketService = new SocketService();
export default socketService;
