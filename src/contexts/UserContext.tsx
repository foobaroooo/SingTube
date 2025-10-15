import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  userName: string | null;
  setUserName: (name: string | null) => void;
  isHost: boolean;
  setIsHost: (host: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  useEffect(() => {
    // Load user name from localStorage on mount
    const storedUserName = localStorage.getItem('singtube_user_name');
    if (storedUserName) {
      setUserNameState(storedUserName);
    }
  }, []);

  const setUserName = (name: string | null) => {
    setUserNameState(name);
    if (name) {
      localStorage.setItem('singtube_user_name', name);
    } else {
      localStorage.removeItem('singtube_user_name');
    }
  };

  return (
    <UserContext.Provider value={{ userName, setUserName, isHost, setIsHost }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};