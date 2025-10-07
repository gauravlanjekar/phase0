import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, TextInput, PasswordInput, Button, Title, Stack, Box } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/dashboard');
    }
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
                >
                  Launch Mission Control
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