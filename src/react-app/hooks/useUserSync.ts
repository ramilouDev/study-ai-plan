import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';


export function useUserSync() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    console.log('UserSync Effect Running', { isLoaded, isSignedIn, userId: user?.id });
    
    const syncUser = async () => {
      if (!isLoaded || !isSignedIn || !user) return ;

      try {

        const response = await fetch(`/api/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          }),
          credentials: 'include', // Importante para CORS
        });


        if (!response.ok) {
          const error = await response.json();
          console.error('Error syncing user:', error);
          return;
        }
      } catch (error) {
        console.error('Error syncing user:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
        }
      }
    };
    syncUser();
  }, [isLoaded, isSignedIn, user]);
} 