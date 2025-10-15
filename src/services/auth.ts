import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID || 'eu-central-1_7w4UtgVHG';
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || '6ucm3gaschj6ugqd84l0phlcht';
const COGNITO_DOMAIN = process.env.REACT_APP_COGNITO_DOMAIN || 'mission-admin-dev-886732474028.auth.eu-central-1.amazoncognito.com';
const getRedirectUri = () => {
  if (process.env.REACT_APP_REDIRECT_URI) {
    return process.env.REACT_APP_REDIRECT_URI;
  }
  // For local development, use localhost:3000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // For production, use origin
  return window.location.origin;
};

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID
});

export interface AuthUser {
  username: string;
  email?: string;
  accessToken: string;
}

export const authService = {
  // Redirect to Cognito Hosted UI
  redirectToLogin: (): void => {
    const redirectUri = getRedirectUri();
    const loginUrl = `https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = loginUrl;
  },

  // Redirect to Cognito Hosted UI for signup
  redirectToSignUp: (): void => {
    const redirectUri = getRedirectUri();
    const signupUrl = `https://${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = signupUrl;
  },

  // Handle OAuth callback
  handleCallback: async (): Promise<AuthUser | null> => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) return null;
    
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code: code,
          redirect_uri: getRedirectUri()
        })
      });
      
      if (!tokenResponse.ok) throw new Error('Token exchange failed');
      
      const tokens = await tokenResponse.json();
      const idToken = JSON.parse(atob(tokens.id_token.split('.')[1]));
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return {
        username: idToken['cognito:username'],
        email: idToken.email,
        accessToken: tokens.access_token
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return null;
    }
  },
  // Sign in user
  signIn: (username: string, password: string): Promise<AuthUser> => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const accessToken = session.getAccessToken().getJwtToken();
          resolve({
            username,
            email: session.getIdToken().payload.email,
            accessToken
          });
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  },

  // Sign up user
  signUp: (username: string, password: string, email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const emailAttribute = new CognitoUserAttribute({
        Name: 'email',
        Value: email
      });
      
      userPool.signUp(username, password, [emailAttribute], [], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  },

  // Confirm sign up
  confirmSignUp: (username: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  },

  // Get current user
  getCurrentUser: (): Promise<AuthUser | null> => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: any, session: CognitoUserSession) => {
        if (err || !session.isValid()) {
          resolve(null);
          return;
        }

        const accessToken = session.getAccessToken().getJwtToken();
        resolve({
          username: cognitoUser.getUsername(),
          email: session.getIdToken().payload.email,
          accessToken
        });
      });
    });
  },

  // Sign out
  signOut: (): void => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  },

  // Get access token for API calls
  getAccessToken: (): Promise<string | null> => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: any, session: CognitoUserSession) => {
        if (err || !session.isValid()) {
          resolve(null);
          return;
        }

        resolve(session.getAccessToken().getJwtToken());
      });
    });
  }
};