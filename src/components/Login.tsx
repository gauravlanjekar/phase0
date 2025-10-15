import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, TextInput, PasswordInput, Button, Title, Stack, Box, Alert, Loader } from '@mantine/core';
import { IconRocket, IconAlertCircle } from '@tabler/icons-react';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();

  useEffect(() => {
    // Check for OAuth callback only
    const handleCallback = async () => {
      const user = await authService.handleCallback();
      if (user) {
        navigate('/dashboard');
      }
    };
    
    if (window.location.search.includes('code=')) {
      handleCallback();
    }
  }, [navigate]);

  // Redirect if already authenticated
  if (!authLoading && user) {
    navigate('/dashboard');
    return null;
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="content-wrapper">
        <Container size="xs" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader size="lg" />
        </Container>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signIn(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleHostedUILogin = () => {
    authService.redirectToLogin();
  };

  return (
    <div className="content-wrapper">
      <Container size="xs" style={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper 
          className="glass-card floating-card" 
          p="xl" 
          radius="xl" 
          style={{ width: '100%' }}
        >
          <Stack align="center" gap="xl">
            <Box style={{ textAlign: 'center' }}>
              <IconRocket size={48} color="#667eea" />
              <Title order={1} mt="md" c="white" size="2rem">
                Mission Admin
              </Title>
              <Title order={3} c="dimmed" fw={400} mt="xs">
                Space Mission Design Platform
              </Title>
            </Box>
            
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
              <Stack gap="lg">
                <TextInput
                  label="Username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  size="md"
                  styles={{
                    input: {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&::placeholder': { color: 'rgba(255, 255, 255, 0.6)' }
                    },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  size="md"
                  styles={{
                    input: {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&::placeholder': { color: 'rgba(255, 255, 255, 0.6)' }
                    },
                    label: { color: 'white', fontWeight: 500 }
                  }}
                />
                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  mt="md"
                  gradient={{ from: '#667eea', to: '#764ba2' }}
                  variant="gradient"
                  radius="md"
                  loading={loading}
                >
                  Launch Mission Control
                </Button>
                
                <Button 
                  onClick={handleHostedUILogin}
                  fullWidth 
                  size="lg" 
                  variant="outline"
                  radius="md"
                  styles={{
                    root: {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }
                  }}
                >
                  Sign in with AWS Cognito
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
};

export default Login;