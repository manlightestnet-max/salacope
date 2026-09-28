import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';

/** A guest (bought without an account) reaching something that needs one: create it, purchases follow. */
export const GuestPrompt: React.FC<{ title?: string }> = ({ title = 'Créez votre compte' }) => {
  const location = useLocation();
  return (
    <Card>
      <CardHeader title={title} description="Vos achats faits sans compte sur cet appareil y sont rattachés : vous les retrouvez partout." />
      <CardBody>
        <Button variant="primary" to={`${ROUTES.signIn}?creer=1&next=${encodeURIComponent(location.pathname)}`}>
          Créer un compte
        </Button>
      </CardBody>
    </Card>
  );
};
